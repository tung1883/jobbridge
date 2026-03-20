const request = require('supertest');
const app     = require('../../src/app');
const pool    = require('../../config/db');

// helper to register a user
const registerUser = (data = {}) => request(app)
  .post('/api/v1/auth/register')
  .set('User-Agent', 'Jest Test Runner')
  .send({
    email:    'john@test.com',
    password: 'Password1!',
    role:     'job_seeker',
    ...data,
  });

// helper to login
const loginUser = (data = {}) => request(app)
  .post('/api/v1/auth/login')
  .set('User-Agent', 'Jest Test Runner')
  .send({
    email:    'john@test.com',
    password: 'Password1!',
    ...data,
    
  });

// clean DB between tests
afterEach(async () => {
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM candidate_profiles');
  await pool.query('DELETE FROM companies');
  await pool.query('DELETE FROM users');
});

// ─── register 
describe('POST /auth/register', () => {
  test('registers job_seeker and returns 201', async () => {
    const res = await registerUser();
    expect(res.statusCode).toBe(201);
    expect(res.body.email).toBe('john@test.com');
    expect(res.body.role).toBe('job_seeker');
  });

  test('registers recruiter and returns 201', async () => {
    const res = await registerUser({ role: 'recruiter' });
    expect(res.statusCode).toBe(201);
    expect(res.body.role).toBe('recruiter');
  });

  test('returns 400 if email already registered', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Email already registered');
  });

  test('returns 400 if email is invalid', async () => {
    const res = await registerUser({ email: 'notanemail' });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 if password too weak', async () => {
    const res = await registerUser({ password: 'weak' });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 if role is admin', async () => {
    const res = await registerUser({ role: 'admin' });
    expect(res.statusCode).toBe(400);
  });

  test('never returns password in response', async () => {
    const res = await registerUser();
    expect(res.body.password).toBeUndefined();
    expect(res.body.password_hash).toBeUndefined();
  });

  test('creates candidate_profile for job_seeker', async () => {
    await registerUser({ role: 'job_seeker' });
    const result = await pool.query(
      'SELECT * FROM candidate_profiles WHERE user_id=(SELECT id FROM users WHERE email=$1)',
      ['john@test.com']
    );
    expect(result.rows.length).toBe(1);
  });

  test('creates company for recruiter', async () => {
    await registerUser({ email: 'rec@test.com', role: 'recruiter' });
    const result = await pool.query(
      'SELECT * FROM companies WHERE user_id=(SELECT id FROM users WHERE email=$1)',
      ['rec@test.com']
    );
    expect(result.rows.length).toBe(1);
  });
});

// ─── login ───────────────────────────────────────────────────
describe('POST /auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  test('returns tokens on valid credentials', async () => {
    const res = await loginUser();
    expect(res.statusCode).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.email).toBe('john@test.com');
    expect(res.body.role).toBe('job_seeker');
  });

  test('returns 401 on wrong password', async () => {
    const res = await loginUser({ password: 'WrongPass1!' });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('returns 401 on unknown email', async () => {
    const res = await loginUser({ email: 'nobody@test.com' });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('stores hashed refresh token in DB', async () => {
    const res = await loginUser();
    const { refresh_token } = res.body;
    const crypto = require('crypto');
    const hash   = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token=$1',
      [hash]
    );
    expect(result.rows.length).toBe(1);
  });

  test('never returns password in response', async () => {
    const res = await loginUser();
    expect(res.body.password).toBeUndefined();
    expect(res.body.password_hash).toBeUndefined();
  });

  test('returns 400 if fields missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Jest Test Runner')
      .send({ email: 'john@test.com' });
    expect(res.statusCode).toBe(400);
  });
});

// ─── refresh ─────────────────────────────────────────────────
describe('POST /auth/refresh', () => {
  let refreshToken;

  beforeEach(async () => {
    await registerUser();
    const res    = await loginUser();
    refreshToken = res.body.refresh_token;
  });

  test('returns new access token with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('User-Agent', 'Jest Test Runner')
      .send({ refresh_token: refreshToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.access_token).toBeDefined();
  });

  test('returns 401 if no refresh token provided', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('User-Agent', 'Jest Test Runner')
      .send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('No refresh token provided');
  });

  test('returns 401 if refresh token is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('User-Agent', 'Jest Test Runner')
      .send({ refresh_token: 'invalidtoken' });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid refresh token');
  });

  test('returns 401 if refresh token is revoked', async () => {
    // logout first to revoke the token
    const loginRes = await loginUser();
    const token    = loginRes.body.refresh_token;
    const accessToken = loginRes.body.access_token;

    await request(app)
      .post('/api/v1/auth/logout')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refresh_token: token });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('User-Agent', 'Jest Test Runner')
      .send({ refresh_token: token });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Refresh token not found or expired');
  });
});

// ─── logout ──────────────────────────────────────────────────
describe('POST /auth/logout', () => {
  let accessToken;
  let refreshToken;

  beforeEach(async () => {
    await registerUser();
    const res    = await loginUser();
    accessToken  = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  test('logs out and revokes refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refresh_token: refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Logged out');

    // verify token is revoked in DB
    const crypto = require('crypto');
    const hash   = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const result = await pool.query(
      'SELECT revoked FROM refresh_tokens WHERE token=$1',
      [hash]
    );
    expect(result.rows[0].revoked).toBe(true);
  });

  test('returns 401 if no access token provided', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('User-Agent', 'Jest Test Runner')
      .send({ refresh_token: refreshToken });
    expect(res.statusCode).toBe(401);
  });

  test('logs out successfully even without refresh token in body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });
});