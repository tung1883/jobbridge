# JobBridge

A job recruitment platform connecting job seekers with recruiters and companies.

## Overview

JobBridge allows:
- **Job seekers** to upload CVs, search and apply for jobs, track application status
- **Recruiters** to post job openings, manage applicants, and view AI-powered candidate rankings

## Tech Stack

| Layer    | Technology          |
| -------- | ------------------- |
| Backend  | Node.js, Express    |
| Frontend | React.js            |
| Database | PostgreSQL          |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation
```bash
# in postgres, create a db name jobbridge then import the .sql file:
psql -U postgres -d jobbridge -f jobbridge.sql
git clone https://github.com/tung1883/jobbridge.git
cd jobbridge
npm install
cp backend/.env.example backend/.env    # fill in your values
npm run dev:all                         # start dev server
```

### Generate DB and API docs
```bash
npm run gendocs      # generate DB + API docs
```

## API

Base URL: `/api/v1`

See [docs/api.md](docs/api.md) for full endpoint reference.

## Database

See [docs/database.md](docs/database.md) for full schema reference.

## License

MIT