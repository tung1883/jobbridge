const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const jwt = require("jsonwebtoken");

const { jwt: jwtConfig } = require('../../config/index');
const pool = require("../../config/db");
const { validate, schemas } = require('../utils/validate');
const { logger } = require('../utils/log/logger');
const { toPostgresInterval } = require('../utils/jwt');
const  auth = require('../../src/middleware/auth')

const router = express.Router();

// routes in this file:
// POST /auth/register
// POST /auth/login
// POST /auth/refresh
// POST /auth/logout

// POST /auth/register: {email, password, role} -> {email, role}
// 1. take input = {email, password}
// 2. pass them through validate() -> if error, return 400 with json({ success: false, errors: messages })
// 3. check if email existed -> if error, return 400 with json({ error: "Email already registered" })
// 4. hash password with bcrypt and 10 salt rounds -> if error, return 500 with json({ error: "Server error" })
// 5. insert into users table
// 6. create profile in candidate_profiles or companies table based on role
// 7. return output = {email, role}
// *notes: there are 3 roles an user can have: jobs_seeker, recruiter and admin
// but this route only allows job_seeker and recruiter to register
// admin will be created manually in the database or (not implemented yet) by another admin through /admin route
router.post("/register", validate(schemas.register), async (req, res) => {
  let client; // DB client, used for creating profile later

  try {
    client = await pool.connect();
    await client.query("BEGIN"); 
    const { email, password, role } = req.body; // no need to validate role here since it's already validated by validate()
      
    // check if email existed
    const existing = await client.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );
  
    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Email already registered"
      });
    }
  
    const hash = await bcrypt.hash(password, 10);
    const result = await client.query(
      "INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) RETURNING id, email, role",
      [email, hash, role]
    );
    const userId = result.rows[0].id;

    if (role === "job_seeker") {
      await client.query(
        `INSERT INTO candidate_profiles (user_id)
          VALUES ($1)`,
        [userId]
      );
    } else if (role === "recruiter") {
      await client.query(
        `INSERT INTO companies (user_id)
          VALUES ($1)`,
        [userId]
      );
    }

    await client.query("COMMIT");
    
    res.status(201).json({ email, role })
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    err.context = { email }; 
    next(err);
  } finally {
    if (client) client.release();
  }
}); 

// POST /auth/login: {email, password} -> {access_token, refresh_token, email, role}
// 1. take input = {email, password}
// 2. pass them through validate() -> if error, return 400 with json({ success: false, errors: messages })
// 3. check if email existed -> if error, return 401 with json({ error: "Invalid credentials" })
// 4. compare password with hash in DB using bcrypt -> if error, return 401 with json({ error: "Invalid credentials" })
// 5. create access token and refresh token with jwt
// 6. hash the referesh token using crypto (faster comparing to bcrypt) and store the hashed in refresh_tokens DB with expiry date
// 7. return output = {access_token, refresh_token, email, role}
// *notes: there are 3 roles an user can have: jobs_seeker, recruiter and admin
// but this route only allows job_seeker and recruiter to register
// admin will be created manually in the database or (not implemented yet) by another admin through /admin route
router.post("/login", validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
  
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );
  
    const user = result.rows[0];
  
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  
    const valid = await bcrypt.compare(password, user.password_hash);
  
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, jti: crypto.randomUUID() },
      jwtConfig.secret,
      { expiresIn: jwtConfig.accessExpiry }
      // { expiresIn: "7d" }
    );
  
    const refreshToken = jwt.sign(
      { id: user.id, jti: crypto.randomUUID() },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshExpiry }
    );
  
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await pool.query(
      `INSERT INTO refresh_tokens(user_id, token, expires_at)
      VALUES($1, $2, NOW() + INTERVAL '${toPostgresInterval(jwtConfig.refreshExpiry)}')`,
      [user.id, refreshTokenHash]
    );
  
    res.json({
      access_token:  accessToken,
      refresh_token: refreshToken,
      email:         user.email,
      role:          user.role,
    });
  } catch (err) {
    err.context = { email };
    next(err)
  }
});

//POST /auth/refresh: {refresh_token} -> {access_token}
// 1. take input = {refresh_token}
// 2. verify the token signature and decode it using jwt -> if error, return 401 with json({ error: "Invalid refresh token" })
// 3. hash the incoming token and compare with DB -> if error, return 401 with json({ error: "Refresh token not found or expired" })
// 4. if valid, check if user still exists -> if error, return 401 with json({ error: "User not found" }
// 5. if valid, issue new access token with user info
// 6. return output = {access_token}
router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    // verify the input refresh token signature first
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, jwtConfig.refreshSecret);
    } catch (err) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // hash the input refresh token and check with the one stored in refresh_tokens table
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');

    const result = await pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token=$1 
       AND user_id=$2 
       AND expires_at > NOW()
       AND revoked = false`,
      [tokenHash, decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Refresh token not found or expired" });
    }

    // get user info for new access token
    const userResult = await pool.query(
      "SELECT id, email, role FROM users WHERE id=$1",
      [decoded.id]
    );
    const user = userResult.rows[0];

    if (!user) { // check this in case user was deleted or banned after the refresh token was issued
      return res.status(401).json({ error: "User not found" });
    }

    // issue new access token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, jti: crypto.randomUUID() },
      jwtConfig.secret,
      { expiresIn: jwtConfig.accessExpiry }
    );

    res.json({ access_token: accessToken });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", auth, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      await pool.query(
        "UPDATE refresh_tokens SET revoked=true WHERE token=$1 AND user_id=$2",
        [tokenHash, req.user.id]
      );
    }

    res.json({ message: "Logged out" });

  } catch (err) {
    next(err);
  }
});

module.exports = router;