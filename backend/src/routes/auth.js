const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const { validate, schemas } = require('../utils/validate');
const {
  register,
  login,
  refresh,
  logout,
} = require('../controllers/auth.controller');

router.post('/register', validate(schemas.register), register);
router.post('/login',    validate(schemas.login),    login);
router.post('/refresh',  refresh);
router.post('/logout',   auth, logout);

module.exports = router;

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

//POST /auth/refresh: {refresh_token} -> {access_token}
// 1. take input = {refresh_token}
// 2. verify the token signature and decode it using jwt -> if error, return 401 with json({ error: "Invalid refresh token" })
// 3. hash the incoming token and compare with DB -> if error, return 401 with json({ error: "Refresh token not found or expired" })
// 4. if valid, check if user still exists -> if error, return 401 with json({ error: "User not found" }
// 5. if valid, issue new access token with user info
// 6. return output = {access_token}

// POST /auth/logout: {refresh_token} -> {message}
// 1. take input = {refresh_token} and access token in header
// 2. verify access token and get user info from it -> if error, return 401
// 3. hash the incoming refresh token and set revoked=true in DB for that token -> if error, return 500
// 4. return output = {message: "Logged out"}