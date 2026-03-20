## JobBridge
- JobBridge is an online job recruitment website that connects job seekers with recruiters and companies:
    + job seekers can updoad their CV, search and apply for jobs
    + employers can post job openings, manage applicants
- webstack: Node.js and React.js

## functions
- the system has 2 main user roles (job seeker/recruiter) -> functionalities will be divided correspondingly

### 1. job seeker
#### 1.1 account management
- [x] registration:
    - candidates can create an account by providing:
        + email address
        + password
        + phone number (optional)
        + authentication verification (email or OTP)
- [x] login/auth:
    - log into using: email + password
    - optinal extensions: oauth (google, linkedln, etc.)

#### 1.2 profile management
- [x] personal info:
    - can read/edit the profile:
        + full name
        + location
        + summary
        + (in furture) email/education/work experience/skills/cert./languages/etc.
- [x] upload and edit CVs:
    - upload files (pdf/docx)
    - preview CVs before submit

#### 1.3 job search
- [x] search for jobs using keywords:
    + job title
    + skill
    + industry
- [x] can filer search results:
    + job position/title
    + company name
    + location
    + job type (fulltime, partime, internship, contract, etc.)
    + salary range
    + experience requirements
    + industry
- [x] view detailed job descriptions
- [x] view company information

#### 1.4 job apply
- [x] apply for jobs:
    1. select a job post
    2. choose a CV
    3. submit the application -> system records
- [x] track status of the application:
    + see status of submitted applications (submitted/under review/shortlisted/rejected/interview scheduled)

#### 1.5 job management
- saved jobs:
    - bookmark jobs of interest
    - one can view or add/remove job from this bookmark list
- application history:
    - can see info of previous applcations: job title, company, application date, status, etc.

#### 1.6 (future) job recommendation system
- provide job reccommendations based on:
    + skills
    + education
    + work experience
    + preivous searches
    + previous applied jobs

### 2. recruiter
#### 2.1 account management
- [x] registration: business email + password
- [x] login/auth: provide email + password
- [x] verify:
    - companies can get verified through:
        + usiness registration documents
        + official company email domain
        + manual administrative review
    - after verified, company can receive a verfied badge

#### 2.2 profile managment
- [x] edit profile:
    + company description
    + industry
    + company size
    + office locations
    + company website
    + company logo
#### 2.3 job posting
- [x] create/edit job post:
    + job description
        + summary
        + responsibilities
        + required qualifications
        + salary range
        + job location
        + job type (Full-time, Part-time, Internship)
- (future) schedule publishing date/application deadline

#### 2.4 applicant managent
- view list of applicatns:
    + an applicant is displayed with: name, application date, CV preview, profile summary
- view CV and download
- filter applicants based on:
    + work experience
    + skills
    + education
    + salary
    + location
- see candidates ranking:
    + system provides AI model ranking candidates to this job post -> send back the result
- contact candidates using system messaging system or email notifications

#### 2.5 analytics
- job posting metrics:
    + number of view for job post
    + number of applicants
- performance analytics:
    + application converesion rate
    + candidate response rate (after contact)
    + recruitment timeline statistics

## architecture
clients
  │
  ▼
API gateway / load balancer
  │
  ▼
application servers
  │
  ├── authentication service
  ├── job service
  ├── application service
  ├── CV service
  └── recommendation service
  └── AI service
  │
  ▼
data layer
  │
  ├── relational database
  ├── object storage
  ├── search engine
  └── cache

## db schema
1. users
CREATE TABLE users (
    id INT  primary key GENERATED ALWAYS AS IDENTITY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'job_seeker'
        CHECK (role IN ('job_seeker','recruiter','admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

2. candidate_profiles
CREATE TABLE candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT,
    location TEXT,
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

3. companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected')),
    description TEXT,
    website TEXT,
    logo_url TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    document_type TEXT,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

4. jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  responsibilities TEXT[],
  required_qualifications TEXT[],
  salary_min NUMERIC,
  salary_max NUMERIC,
  currency TEXT,
  location TEXT,
  job_type TEXT,
  publishing_date TIMESTAMP,
  application_deadline TIMESTAMP,
  created_by INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  search_vector tsvector
);
UPDATE jobs SET search_vector = to_tsvector('english', title || ' ' || description);
CREATE FUNCTION jobs_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', NEW.title || ' ' || NEW.description);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE INDEX idx_jobs_search ON jobs USING GIN(search_vector);

CREATE TRIGGER tsvectorupdate
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION jobs_search_trigger();

5. cv
CREATE TABLE cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

*Note: files are stored in object storage

6. applications (candidates applying to job)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,

  cv_url TEXT NOT NULL,

  status TEXT DEFAULT 'submitted',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

7. saved_jobs (jobs bookmarked by candidate)
CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

8. job_views (for analytics)
CREATE TABLE job_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

9. messages between recruiter and candidate
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    content TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

10. candidate rankings (stored from AI output)
CREATE TABLE candidate_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    candidate_id UUID REFERENCES users(id),
    score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

11. search history
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    keyword TEXT,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_saved_jobs_user ON saved_jobs(user_id);

## flow of functionalities