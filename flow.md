### 1. job seeker
#### 1.1 account management
- registration:
    - API: POST /auth/register with JSON request {email, password, role}
    - Flow:
    Client (React) -> API Gateway -> Auth Controller: (1) validate input, (2) check if email exists, (3) hash password (bcrypt), (4) send response
    - Extensions:
        + log in with phone number
        + authentication verification (email or OTP)
- login/auth:
    1. normal login (use email + password)
    - API: /auth/login with JSON request {email, password}
    - Flow: Client -> API -> Auth Controller: (1) find user, (2) compare password (bcrypt), (3) generate access, refresh tokens with JWT, (4) store refesh token, (5) send response
    - Extensions: oauth
    * Note: access token is for API requests, for example, client sends:
    GET /api/jobs
    Authorization: Bearer ACCESS_TOKEN
    -> middleware verifies token, if valid, then authorizes,but access token expires quickly (15-20min.) -> if expired, use refresh token to refesh
    2. refresh access token
    - API: POST auth/refresh with JSON request {refresh_token}
    - Flow: access token expired -> client sends refresh token -> BE verifies with refresh token stored in DB, generates new access token and send back
    - Extension: security problem with refresh token
        + Check out: https://medium.com/@bchainbard.annonymousasquare/refresh-token-rotation-done-right-how-to-protect-your-backend-from-token-theft-a875435a78c6
- read profile
    API 1: GET /profiles/candidates (for user to read their own profile)
    API 2: GET /profiles/candidates/:id (pubic read)
- edit profile
    API: PUT /profiles/candidates/ with JSON request {full_namel, location, summary}
- manage cv:
    API 1: POST /cvs/ with file
    API 2: GET /cvs/
    API 3: GET /cvs/:id
    API 4: PUT /cvs/:id
    API 5: DEL /cvs/:id
    - Extension: use Object Storage
- find and filter jobs -> see 2.2
- apply for a job (see 2.3)
    - Extensions: Get notified about status of applications

### 2. recruiter
#### 2.1. account management
- registration:
    - API: POST /auth/register with JSON request {email, password, role}
- set up profile:
    - API: PUT /profiles/companies/ with JSON message { description, website, logo_url, location} (edit company)
    - API: PUT /profiles/companies/logo to upload logo image
- send papers to verify:
    - API: POST /profiles/companies/verify
#### 2.2. manage jobs:
- API 1: POST /jobs/
- API 2: PUT /jobs/:id
- API 3: GET /jobs/my (recruiter see their posted jobs)
- API 4: GET /jobs/ (for all users)
    + can query with fields: search, location, minSalary, maxSalary
- API 5: GET /jobs/:id/company (for when job_seekeer see a job and wanna see the company info)
#### 2.3. manage applications
- API 1: POST /applications/ with JSON request {job_id, cv_id}
### 3. admin
- cron job: delete refresh tokens
- rate limiting
- input sanitization
- check for approval of companies

### others
- upload/edit CV -> save parsed version
- with api that has file upload (cv, logo, verify)
    + if user uploads new one -> delete old ones
- salary check (jobs)
- add exchange rate (now the filter does not care about currency), same for location