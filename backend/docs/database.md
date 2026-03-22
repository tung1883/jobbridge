# Database Documentation
> Auto-generated on 2026-03-22T05:42:00.920Z

---

## applications

### Columns

| Column     | Type      | Nullable | Default           |
| ---------- | --------- | -------- | ----------------- |
| id         | uuid      | NO       | gen_random_uuid() |
| job_id     | uuid      | YES      | -                 |
| user_id    | int       | YES      | -                 |
| cv_url     | text      | NO       | -                 |
| status     | text      | YES      | 'submitted'::text |
| created_at | timestamp | YES      | now()             |
| updated_at | timestamp | YES      | now()             |

### Primary Key
- `id`

### Foreign Keys

| Column  | References | On Delete |
| ------- | ---------- | --------- |
| job_id  | jobs(id)   | CASCADE   |
| user_id | users(id)  | CASCADE   |

### Indexes

- `applications_pkey`: `CREATE UNIQUE INDEX applications_pkey ON public.applications USING btree (id)`

### Constraints

- `applications_id_not_null`: `id IS NOT NULL`
- `applications_cv_url_not_null`: `cv_url IS NOT NULL`

---

## candidate_profiles

### Columns

| Column     | Type      | Nullable | Default           |
| ---------- | --------- | -------- | ----------------- |
| id         | uuid      | NO       | gen_random_uuid() |
| user_id    | int       | YES      | -                 |
| full_name  | text      | YES      | -                 |
| location   | text      | YES      | -                 |
| summary    | text      | YES      | -                 |
| created_at | timestamp | YES      | CURRENT_TIMESTAMP |

### Primary Key
- `id`

### Indexes

- `candidate_profiles_pkey`: `CREATE UNIQUE INDEX candidate_profiles_pkey ON public.candidate_profiles USING btree (id)`
- `candidate_profiles_user_id_key`: `CREATE UNIQUE INDEX candidate_profiles_user_id_key ON public.candidate_profiles USING btree (user_id)`

### Constraints

- `candidate_profiles_id_not_null`: `id IS NOT NULL`

---

## companies

### Columns

| Column              | Type      | Nullable | Default           |
| ------------------- | --------- | -------- | ----------------- |
| id                  | uuid      | NO       | gen_random_uuid() |
| user_id             | int       | YES      | -                 |
| name                | text      | YES      | -                 |
| verification_status | text      | YES      | 'pending'::text   |
| description         | text      | YES      | -                 |
| website             | text      | YES      | -                 |
| logo_url            | text      | YES      | -                 |
| location            | text      | YES      | -                 |
| created_at          | timestamp | YES      | CURRENT_TIMESTAMP |

### Primary Key
- `id`

### Foreign Keys

| Column  | References | On Delete |
| ------- | ---------- | --------- |
| user_id | users(id)  | CASCADE   |

### Indexes

- `companies_pkey`: `CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id)`
- `companies_user_id_key`: `CREATE UNIQUE INDEX companies_user_id_key ON public.companies USING btree (user_id)`

### Constraints

- `companies_verification_status_check`: `(verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text]))`
- `companies_id_not_null`: `id IS NOT NULL`

---

## company_verification_documents

### Columns

| Column        | Type      | Nullable | Default           |
| ------------- | --------- | -------- | ----------------- |
| id            | uuid      | NO       | gen_random_uuid() |
| company_id    | uuid      | YES      | -                 |
| document_type | text      | YES      | -                 |
| file_path     | text      | NO       | -                 |
| uploaded_at   | timestamp | YES      | CURRENT_TIMESTAMP |

### Primary Key
- `id`

### Foreign Keys

| Column     | References    | On Delete |
| ---------- | ------------- | --------- |
| company_id | companies(id) | CASCADE   |

### Indexes

- `company_verification_documents_pkey`: `CREATE UNIQUE INDEX company_verification_documents_pkey ON public.company_verification_documents USING btree (id)`

### Constraints

- `company_verification_documents_id_not_null`: `id IS NOT NULL`
- `company_verification_documents_file_path_not_null`: `file_path IS NOT NULL`

---

## cvs

### Columns

| Column      | Type      | Nullable | Default           |
| ----------- | --------- | -------- | ----------------- |
| id          | uuid      | NO       | gen_random_uuid() |
| user_id     | int       | YES      | -                 |
| file_name   | text      | YES      | -                 |
| file_path   | text      | NO       | -                 |
| uploaded_at | timestamp | YES      | CURRENT_TIMESTAMP |

### Primary Key
- `id`

### Indexes

- `cvs_pkey`: `CREATE UNIQUE INDEX cvs_pkey ON public.cvs USING btree (id)`

### Constraints

- `cvs_id_not_null`: `id IS NOT NULL`
- `cvs_file_path_not_null`: `file_path IS NOT NULL`

---

## jobs

### Columns

| Column                  | Type      | Nullable | Default           |
| ----------------------- | --------- | -------- | ----------------- |
| id                      | uuid      | NO       | gen_random_uuid() |
| title                   | text      | NO       | -                 |
| description             | text      | YES      | -                 |
| responsibilities        | text      | YES      | -                 |
| required_qualifications | text      | YES      | -                 |
| salary_min              | numeric   | YES      | -                 |
| salary_max              | numeric   | YES      | -                 |
| currency                | text      | YES      | -                 |
| location                | text      | YES      | -                 |
| job_type                | text      | YES      | -                 |
| publishing_date         | timestamp | YES      | -                 |
| application_deadline    | timestamp | YES      | -                 |
| created_by              | int       | YES      | -                 |
| created_at              | timestamp | YES      | now()             |
| updated_at              | timestamp | YES      | now()             |
| search_vector           | tsvector  | YES      | -                 |

### Primary Key
- `id`

### Foreign Keys

| Column     | References | On Delete |
| ---------- | ---------- | --------- |
| created_by | users(id)  | CASCADE   |

### Indexes

- `jobs_pkey`: `CREATE UNIQUE INDEX jobs_pkey ON public.jobs USING btree (id)`
- `idx_jobs_search`: `CREATE INDEX idx_jobs_search ON public.jobs USING gin (search_vector)`

### Constraints

- `jobs_id_not_null`: `id IS NOT NULL`
- `jobs_title_not_null`: `title IS NOT NULL`

### Triggers

| Trigger        | Event  | Timing |
| -------------- | ------ | ------ |
| tsvectorupdate | INSERT | BEFORE |
| tsvectorupdate | UPDATE | BEFORE |

---

## refresh_tokens

### Columns

| Column     | Type      | Nullable | Default                                    |
| ---------- | --------- | -------- | ------------------------------------------ |
| id         | int       | NO       | nextval('refresh_tokens_id_seq'::regclass) |
| user_id    | int       | YES      | -                                          |
| token      | text      | NO       | -                                          |
| expires_at | timestamp | NO       | -                                          |
| created_at | timestamp | YES      | now()                                      |
| revoked    | bool      | YES      | false                                      |

### Primary Key
- `id`

### Indexes

- `refresh_tokens_pkey`: `CREATE UNIQUE INDEX refresh_tokens_pkey ON public.refresh_tokens USING btree (id)`

### Constraints

- `refresh_tokens_id_not_null`: `id IS NOT NULL`
- `refresh_tokens_token_not_null`: `token IS NOT NULL`
- `refresh_tokens_expires_at_not_null`: `expires_at IS NOT NULL`

---

## users

### Columns

| Column        | Type      | Nullable | Default            |
| ------------- | --------- | -------- | ------------------ |
| id            | int       | NO       | -                  |
| email         | text      | NO       | -                  |
| password_hash | text      | NO       | -                  |
| role          | text      | NO       | 'job_seeker'::text |
| is_verified   | bool      | YES      | false              |
| created_at    | timestamp | YES      | CURRENT_TIMESTAMP  |

### Primary Key
- `id`

### Indexes

- `users_pkey`: `CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)`
- `users_email_key`: `CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)`

### Constraints

- `users_role_check`: `(role = ANY (ARRAY['job_seeker'::text, 'recruiter'::text, 'admin'::text]))`
- `users_id_not_null`: `id IS NOT NULL`
- `users_email_not_null`: `email IS NOT NULL`
- `users_password_hash_not_null`: `password_hash IS NOT NULL`
- `users_role_not_null`: `role IS NOT NULL`

---

