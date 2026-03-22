# API Documentation
> Auto-generated on 2026-03-22T05:42:01.263Z

---

## /api/v1/applications

| Method | Path                            |
| ------ | ------------------------------- |
| POST   | /api/v1/applications            |
| GET    | /api/v1/applications/my         |
| GET    | /api/v1/applications/job/:jobId |
| PUT    | /api/v1/applications/:id/status |

## /api/v1/auth

| Method | Path                  |
| ------ | --------------------- |
| POST   | /api/v1/auth/register |
| POST   | /api/v1/auth/login    |
| POST   | /api/v1/auth/refresh  |
| POST   | /api/v1/auth/logout   |

## /api/v1/bookmarks

| Method | Path                           |
| ------ | ------------------------------ |
| POST   | /api/v1/bookmarks/saved        |
| DELETE | /api/v1/bookmarks/saved/:jobId |
| GET    | /api/v1/bookmarks/saved        |

## /api/v1/cvs

| Method | Path            |
| ------ | --------------- |
| POST   | /api/v1/cvs     |
| GET    | /api/v1/cvs     |
| GET    | /api/v1/cvs/:id |
| PUT    | /api/v1/cvs/:id |
| DELETE | /api/v1/cvs/:id |

## /api/v1/jobs

| Method | Path                     |
| ------ | ------------------------ |
| GET    | /api/v1/jobs/my          |
| GET    | /api/v1/jobs             |
| POST   | /api/v1/jobs             |
| PUT    | /api/v1/jobs/:id         |
| GET    | /api/v1/jobs/:id/company |

## /api/v1/profiles

| Method | Path                              |
| ------ | --------------------------------- |
| GET    | /api/v1/profiles/candidates/my    |
| PUT    | /api/v1/profiles/candidates/      |
| GET    | /api/v1/profiles/candidates/:id   |
| PUT    | /api/v1/profiles/companies        |
| PUT    | /api/v1/profiles/companies/logo   |
| POST   | /api/v1/profiles/companies/verify |
| GET    | /api/v1/profiles/companies/my     |
| GET    | /api/v1/profiles/companies/:id    |

## /api/v1/ranking

| Method | Path                    |
| ------ | ----------------------- |
| GET    | /api/v1/ranking/:job_id |

