# Project Journal

Running log of what this application is and every notable reset, change, or update made to it. Newest entries first.

## What This App Is

**NSC ICT Service Desk and Asset Management System** — a full-stack prototype web application for managing ICT assets and staff service/support requests.

- **Frontend:** React + Vite (built assets served by Express in production)
- **Backend:** Node.js + Express (`backend/src`)
- **Database:** PostgreSQL, managed through `npm run migrate` (`database/migrations`); `database/schema.sql` is legacy reference only
- **Auth:** JWT sessions, bcrypt password hashing, role-based access (Admin, ICT Officer, Technician, Staff)
- **Core features:** ticket lifecycle and assignment, SLA management, notification service, asset and maintenance records, knowledge base articles, departments/staff management, dashboards and reports (CSV export), audit logs, account invitations with expiry sweep for temporary users
- **Access model:** public self-registration disabled; accounts are created by an administrator or accepted via an invitation link
- **Ops:** health endpoints (`/api/health`, `/api/health/readiness`, `/api/health/operations`), GitHub Actions CI, secret scan, smoke checks, Docker image + docker-compose example

## Change / Reset Log

| Date | Commit | Type | Summary |
|---|---|---|---|
| 2026-10-06 | `37fb493` | Update | Improved knowledge base (seed articles, bundled images into protected article-media storage). |
| 2026-10-06 | `dc861df` | Update | General improvements pass across the app. |
| 2026-09-28 | `44fa2e9` | Update | Containerized the application (Dockerfile, `deploy/docker-compose.example.yml`, deployment docs). |
| 2026-09-18 | `1df157a` | Fix | Improved the notification system. |
| 2026-09-17 | `04ea7e4` | Refactor | Role-based dashboard rendering. |
| 2026-09-15 | `4da60f3` | Cleanup | Removed leftover React shell and cleaned up designs. |
| 2026-09-11 | `4c1e6e3` | Refactor | Removed old React app shell, replaced with secure app shell, added loading states. |
| 2026-09-11 | `462e749` | Refactor | Refactored authentication screens. |
| 2026-09-10 | `e98fb6f` | Cleanup | System architecture cleanup. |
| 2026-09-01 | `e9dd44c` | Migration | Migrated the frontend to React. |
| 2026-08-29 | `8bde1e3` | Cleanup | Standardized the codebase. |
| 2026-08-26 | `b5550b6` | Test | Tested the knowledge base and ticket workflow. |
| 2026-08-25 | `8d80295` | Feature | Implemented notification service, assignment and SLA management, improved ticket management system. |
| 2026-08-24 | `faa6be7` | Reset | Initial commit of the full project (baseline). |

## Notes

- Branch in use: `dev`.
- No `journal.md` existed before this file; it was created as the project's change/reset record.
- Append new entries at the top of the Change / Reset Log table as further updates land.
