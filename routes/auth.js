const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

//  3 roles: jobs_seeker, recruiter and admin
router.post("/register", async (req, res) => {
  try {
    const client = await pool.connect(); // for creating profile 
    const { email, password, role } = req.body;
  
    // check if email existed
    const existing = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );
  
    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Email already registered"
      });
    }
  
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) RETURNING *",
      [email, hash, (role) ? role : "job_seeker"]
    );
  
    const userId = result.rows[0].id;
    if (role === null || role === "job_seeker") {
      await client.query(
        `INSERT INTO candidate_profiles (user_id)
          VALUES ($1)`,
        [userId]
      );
      await client.query("COMMIT");
    }
  
    if (role === "recruiter") {
        await client.query(
        `INSERT INTO companies (user_id)
          VALUES ($1)`,
        [userId]
      );
      await client.query("COMMIT");
    }
  
    res.send("Account created!")
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
    await client.query("ROLLBACK");
  }
}); 

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  const user = result.rows[0];

  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) return res.status(401).send("Wrong password");

  const accessToken = jwt.sign(
    { id: user.id, role: user.role, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
    // { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  await pool.query(
    `INSERT INTO refresh_tokens(user_id, token, expires_at)
     VALUES($1,$2, NOW() + INTERVAL '7 days')`,
    [user.id, refreshToken]
  );

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken
  });
});

module.exports = router;