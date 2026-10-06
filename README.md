# NSC ICT Service Desk and Asset Management System

A full-stack prototype web application for managing ICT assets and staff service/support requests.

- Frontend: React + Vite, served by Express in production
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT sessions, bcrypt password hashing, role-based access

## 1. Prerequisites

Install:

1. Node.js 18 or later
2. PostgreSQL 13 or later
3. Visual Studio Code if desired

Check your installs:

```bash
node -v
npm -v
psql --version
```

## 2. Project Structure

```text
nsc-ict-system/
|- backend/
|  |- src/
|  |  |- app.js
|  |  |- server.js
|  |  |- config/
|  |  |- middleware/
|  |  |- modules/
|  |  |- scripts/
|  |  `- utils/
|  |- test/
|  |- package.json
|  `- .env.example
|- frontend/
|  |- src/
|  |- dist/
|  |- react-shell.html
|  `- package.json
|- database/
|  |- schema.sql
|  |- migrations/
|  |- seed.sql
|  `- queries.sql
|- deploy/
|  `- docker-compose.example.yml
|- docs/
|  |- system-design/phase-1/
|  `- system-design/phase-2/
|- Dockerfile
|- TESTING_CHECKLIST.md
`- README.md
```

## 3. Set Up PostgreSQL

1. Create the database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE nsc_ict_system;
\q
```

2. Apply migrations and seed data:

```bash
cd backend
npm install
npm run migrate
cd ..
psql -U postgres -d nsc_ict_system -f database/seed.sql
cd backend
npm run seed:knowledge-base
```

The Knowledge Base seed installs five general support articles and copies their bundled images into protected article-media storage. It is idempotent and can be rerun safely after migrations.

`npm run migrate` is the authoritative schema setup path for new local databases. `database/schema.sql` is kept as a legacy reference and should not be run against a database that contains data.

## 4. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Set your real local values in `.env`:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=nsc_ict_system
PGUSER=postgres
PGPASSWORD=your_actual_password
PORT=5000
NODE_ENV=development
INTERNAL_APP_BASE_URL=http://localhost:5000
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
ORGANIZATION_EMAIL_DOMAINS=nscict.local
ACCOUNT_EXPIRY_SWEEP_INTERVAL_MINUTES=60
ACCOUNT_EXPIRY_SWEEP_ON_START=true
INVITATION_TOKEN_BYTES=24
```

## 5. Run the Application

For production-style local serving, build React first and then start Express:

```bash
cd frontend
npm install
npm run build
cd ../backend
npm start
```

The backend serves the React frontend automatically at `http://localhost:5000` and keeps `/api/*` reserved for backend routes.

Useful backend commands:

```bash
npm run dev
npm run migrate
npm run expire-accounts
npm run ci
npm run secret-scan
npm run smoke
npm run release:check
npm test
```

Operational health endpoints:

- `GET /api/health` returns a lightweight liveness payload.
- `GET /api/health/readiness` checks database connectivity and migration tracking.
- `GET /api/health/operations` returns migration, job, notification queue, and SLA status for authenticated operational users only.

Every API request receives an `X-Request-ID` correlation value for troubleshooting.

Release controls:

- Pull requests and pushes to `main` or `master` run the backend GitHub Actions workflow.
- `npm run ci` runs the backend test suite and committed-secret scan.
- `npm run release:check` adds dependency audit and package assembly checks.
- `npm run smoke` verifies `/api/health` and `/api/health/readiness` against a running app. Set `SMOKE_BASE_URL` to target a deployed environment.

Container deployment references:

- `Dockerfile` packages the backend and static frontend.
- `deploy/docker-compose.example.yml` provides a local app plus PostgreSQL smoke environment.
- `docs/deployment/deployment.md` documents build and runtime expectations.
- `docs/deployment/backup-restore.md` documents PostgreSQL and attachment backup/restore steps.

## 6. Access Model

Public self-registration is disabled.

Users must be onboarded in one of these ways:

- direct administrator-created account
- administrator-issued invitation accepted through `/activate`

Access rules:

- Employees must use an approved organization email domain.
- Temporary users such as interns, corpers, contractors, and guests require a sponsor and an account expiration date.
- Expired temporary accounts are blocked at login and can be deactivated automatically by the expiry sweep.

## 7. Demo Data

Seeded demo accounts exist for administrator, ICT officer, and technician roles. The optional Knowledge Base seed adds five published general support articles with captioned images. Use these development seeds and internal project instructions for local testing rather than public onboarding.

## 8. Role Permissions Summary

| Action | Admin | ICT Officer | Technician | Staff |
|---|:---:|:---:|:---:|:---:|
| View dashboard | Yes | Yes | Yes | Yes |
| Add or edit assets | Yes | Yes | No | No |
| Delete assets | Yes | No | No | No |
| Submit service request | Yes | Yes | Yes | Yes |
| Assign technician to a request | Yes | Yes | No | No |
| Update assigned request status | Yes | Yes | Yes | No |
| Add maintenance record | Yes | Yes | Yes | No |
| Manage staff accounts | Yes | View only | No | No |
| Manage departments | Yes | View only | No | No |
| View reports and audit logs | Yes | Yes | No | No |

## 9. Known Limitations

- No mail provider is integrated, so invitation links are copied manually by administrators.
- No file attachments are implemented for tickets or maintenance records.
- Reporting export is CSV only.
- This remains a prototype and still needs broader integration and security hardening for production deployment.

## 10. Troubleshooting

- `ECONNREFUSED`: confirm PostgreSQL is running and `.env` matches your local database.
- `password authentication failed`: check `PGUSER` and `PGPASSWORD`.
- Port conflict: change `PORT` in `.env`.
- Blank page or refresh 404: run `npm run build` from `frontend/`, then load the app through the Express server URL.
