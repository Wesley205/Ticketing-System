# NSC ICT Service Desk and Asset Management System

A full-stack prototype web application for managing ICT assets and staff service/support requests.

- Frontend: HTML5 / CSS3 / vanilla JavaScript
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
|  |  |- routes/
|  |  |- scripts/
|  |  `- utils/
|  |- test/
|  |- package.json
|  `- .env.example
|- frontend/
|- database/
|  |- schema.sql
|  |- migrations/
|  |- seed.sql
|  `- queries.sql
|- docs/
|  |- system-design/phase-1/
|  `- system-design/phase-2/
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

2. Apply schema, migrations, and seed data:

```bash
psql -U postgres -d nsc_ict_system -f database/schema.sql
cd backend
npm install
npm run migrate
cd ..
psql -U postgres -d nsc_ict_system -f database/seed.sql
```

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

```bash
cd backend
npm start
```

The backend serves the frontend automatically at `http://localhost:5000`.

Useful backend commands:

```bash
npm run dev
npm run migrate
npm run expire-accounts
npm test
```

## 6. Access Model

Public self-registration is disabled.

Users must be onboarded in one of these ways:

- direct administrator-created account
- administrator-issued invitation accepted through `/register.html`

Access rules:

- Employees must use an approved organization email domain.
- Temporary users such as interns, corpers, contractors, and guests require a sponsor and an account expiration date.
- Expired temporary accounts are blocked at login and can be deactivated automatically by the expiry sweep.

## 7. Demo Data

Seeded demo accounts exist for administrator, ICT officer, technician, and staff roles. Use the existing seed and internal project instructions for local testing rather than public onboarding.

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
- Blank page or refresh 404: load the app through the Express server URL, not by opening HTML files directly.
