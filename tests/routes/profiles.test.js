const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../config/db');
const { generateTestingEmail } = require('../setup');

const registerUser = (data = {}) =>
  request(app)
    .post('/api/v1/auth/register')
    .set('User-Agent', 'Jest Test Runner')
    .send({
      email: 'john@test.com',
      password: 'Password1!',
      role: 'job_seeker',
      ...data,
    });

const loginUser = (data = {}) =>
  request(app)
    .post('/api/v1/auth/login')
    .set('User-Agent', 'Jest Test Runner')
    .send({
      email: 'john@test.com',
      password: 'Password1!',
      ...data,
    });

afterEach(async () => {
  await pool.query('DELETE FROM company_verification_documents');
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM candidate_profiles');
  await pool.query('DELETE FROM companies');
  await pool.query('DELETE FROM users');
});

describe('GET /profiles/candidates/my', () => {
  test('returns 401 when no token provided', async () => {
    const res = await request(app)
      .get('/api/v1/profiles/candidates/my')
      .set('User-Agent', 'Jest Test Runner');

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  test('returns 403 for recruiter token', async () => {
    const email = generateTestingEmail();
    await registerUser({ email, role: 'recruiter' });
    const loginRes = await loginUser({ email });

    const res = await request(app)
      .get('/api/v1/profiles/candidates/my')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access forbidden');
  });

  test('returns candidate profile for job seeker', async () => {
    const email = generateTestingEmail();
    await registerUser({ email });
    const loginRes = await loginUser({ email });

    const res = await request(app)
      .get('/api/v1/profiles/candidates/my')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        full_name: null,
        location: null,
        summary: null,
      })
    );
  });

  test('returns 404 if candidate profile row does not exist', async () => {
    const email = generateTestingEmail();
    await registerUser({ email });
    const loginRes = await loginUser({ email});

    await pool.query('DELETE FROM candidate_profiles WHERE user_id = (SELECT id FROM users WHERE email = $1)', [email]);

    const res = await request(app)
      .get('/api/v1/profiles/candidates/my')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Profile not found');
  });
});

describe('PUT /profiles/candidates', () => {
  test('updates candidate profile for authenticated job seeker', async () => {
    const email = generateTestingEmail();
    await registerUser({ email });
    const loginRes = await loginUser({ email});

    const payload = {
      full_name: 'John Doe',
      location: 'Bangkok',
      summary: 'Backend engineer',
    };

    const res = await request(app)
      .put('/api/v1/profiles/candidates/')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        full_name: payload.full_name,
        location: payload.location,
        summary: payload.summary,
      })
    );
  });

  test('returns 403 for recruiter token', async () => {
    const email = generateTestingEmail();
    await registerUser({ email, role: 'recruiter' });
    const loginRes = await loginUser({ email });

    const res = await request(app)
      .put('/api/v1/profiles/candidates/')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`)
      .send({ full_name: 'Should not update' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access forbidden');
  });
});

describe('GET /profiles/candidates/:id', () => {
  test('returns 404 for invalid UUID format', async () => {
    const res = await request(app)
      .get('/api/v1/profiles/candidates/not-a-uuid')
      .set('User-Agent', 'Jest Test Runner');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Profile not found');
  });

  test('returns 404 when profile UUID is valid but not found', async () => {
    const res = await request(app)
      .get('/api/v1/profiles/candidates/11111111-1111-4111-8111-111111111111')
      .set('User-Agent', 'Jest Test Runner');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Profile not found');
  });

  test('returns public candidate profile by id', async () => {
    const email = generateTestingEmail();
    await registerUser({ email });

    const profileQuery = await pool.query(
      'SELECT id, full_name, location, summary FROM candidate_profiles WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      [email]
    );
    const profile = profileQuery.rows[0];

    await pool.query(
      'UPDATE candidate_profiles SET full_name = $1, location = $2, summary = $3 WHERE id = $4',
      ['John Public', 'Hanoi', 'Open to work', profile.id]
    );

    const res = await request(app)
      .get(`/api/v1/profiles/candidates/${profile.id}`)
      .set('User-Agent', 'Jest Test Runner');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: profile.id,
        full_name: 'John Public',
        location: 'Hanoi',
        summary: 'Open to work',
      })
    );
  });
});

describe('GET /profiles/companies/:id', () => {
  test('returns 404 when company not found', async () => {
    const res = await request(app)
      .get('/api/v1/profiles/companies/11111111-1111-4111-8111-111111111111')
      .set('User-Agent', 'Jest Test Runner');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Company not found');
  });

  test('returns public company profile and expands logo URL', async () => {
    const email = generateTestingEmail();
    await registerUser({ email , role: 'recruiter' });

    const companyQuery = await pool.query(
      'SELECT id FROM companies WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      [email]
    );
    const companyId = companyQuery.rows[0].id;

    await pool.query(
      'UPDATE companies SET name = $1, description = $2, website = $3, location = $4, logo_url = $5 WHERE id = $6',
      ['ACME', 'Hiring', 'https://acme.test', 'Bangkok', '/uploads/logos/acme.png', companyId]
    );

    const res = await request(app)
      .get(`/api/v1/profiles/companies/${companyId}`)
      .set('User-Agent', 'Jest Test Runner');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: companyId,
        name: 'ACME',
        description: 'Hiring',
        website: 'https://acme.test',
        location: 'Bangkok',
        logo_url: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/uploads\/logos\/acme\.png$/),
      })
    );
  });
});

describe('GET /profiles/companies/my', () => {
  test('returns recruiter company profile', async () => {
    const email = generateTestingEmail();
    await registerUser({ email, role: 'recruiter' });
    const loginRes = await loginUser({ email });

    await pool.query(
      'UPDATE companies SET name = $1, location = $2 WHERE user_id = (SELECT id FROM users WHERE email = $3)',
      ['ACME', 'Bangkok', email]
    );

    const res = await request(app)
      .get('/api/v1/profiles/companies/my')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        name: 'ACME',
        location: 'Bangkok',
      })
    );
  });

  test('returns 403 for job seeker token', async () => {
    const email = generateTestingEmail();
    await registerUser({ email, role: 'job_seeker' });
    const loginRes = await loginUser({ email});

    const res = await request(app)
      .get('/api/v1/profiles/companies/my')
      .set('User-Agent', 'Jest Test Runner')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access forbidden');
  });
});
