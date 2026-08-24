# Requirements Baseline

## Document purpose

This document records:

- the current system confirmed from the repository
- the business goals stated in the Phase 1 brief
- the target requirements for a safer internal ICT service desk

It separates confirmed current behavior from recommended target behavior.

## Product purpose

The system is an internal ICT service-management platform for:

- reporting technical issues
- assigning and tracking ICT work
- managing organizational assets
- recording maintenance work
- producing operational reports
- preserving accountability through audit history

## Confirmed current system

Confirmed from the repository:

- Backend: Node.js, Express, PostgreSQL, JWT, bcrypt, express-validator
- Frontend: static HTML, CSS, and vanilla JavaScript served by Express
- Data model: departments, users, assets, service requests, maintenance, audit logs
- Authentication: login, self-registration, current-user profile
- Roles currently implemented: `admin`, `ict_officer`, `technician`, `staff`
- Reporting currently implemented: dashboard counts, report summary, CSV export
- Audit logging currently implemented for key create/update actions

Confirmed limitations from code and documentation:

- Public self-registration is enabled
- No invitation workflow exists
- No user type model exists
- No ticket comments, internal notes, attachments, or ticket history tables exist
- No notification module exists
- No password reset workflow exists
- No SLA policy table or SLA enforcement exists
- No knowledge base module exists
- No soft-delete/archive pattern exists for major records

## Target users

Confirmed or required target audiences:

- Staff requesters
- Technicians
- ICT officers
- Administrators
- Approved temporary users such as interns, corpers, and contractors

## Main business problems

- Technical issues need structured intake and tracking.
- ICT officers need controlled assignment and oversight.
- Technicians need a manageable work queue and status workflow.
- Departments need visibility into their own requests.
- Administrators need stronger identity controls and operational reporting.
- The organization needs durable asset, maintenance, and audit history.

## Core workflows

### Confirmed current workflows

1. A user registers or logs in.
2. A requester submits a service request.
3. An administrator or ICT officer assigns a technician.
4. A technician or ICT officer changes the request status.
5. ICT staff create and update asset records.
6. ICT staff create maintenance records linked to assets.
7. Administrators and ICT officers view reports and audit logs.

### Required target workflows

1. Administrators create or approve accounts for all non-employee users.
2. Employees sign in with approved organization identities.
3. Tickets move through a governed lifecycle with comments, notes, attachments, and history.
4. Department visibility is limited by role and department membership.
5. SLA monitoring and escalation operate on ticket priority and type.
6. Asset assignment and return produce a full assignment history.
7. Audit records capture all sensitive administrative actions.

## In-scope features for the target system

- Controlled identity and access model
- User types separate from system roles
- Department-aware ticket visibility
- Expanded ticket lifecycle and status governance
- Asset lifecycle governance and assignment history
- Maintenance workflow refinement
- API normalization and validation standards
- Reporting, export, and audit requirements
- Safe migration from current schema to target schema

## Out-of-scope features for Phase 1

- Full implementation of the new target model
- Destructive data migration scripts
- Production deployment changes
- SSO implementation
- MFA implementation
- Email or SMS provider integration
- Native mobile apps

## Functional requirements

### Confirmed current functionality

| Area | Confirmed current behavior |
|---|---|
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Users | Admin creates, updates, activates, and deactivates users |
| Departments | Authenticated users can list and view departments; admin can create and update |
| Tickets | Authenticated users can create and list requests; admin and ICT officers can assign; admin, ICT officers, and technicians can change status |
| Assets | Authenticated users can view; admin and ICT officers can create, update, assign, and delete; technicians can change status |
| Maintenance | Authenticated users can view; admin, ICT officers, and technicians can create and update |
| Reports | Admin and ICT officers can view summary and export CSV |
| Audit logs | Admin and ICT officers can query audit history |

### Required improvements

- Replace public registration with controlled onboarding.
- Add `user_type` and temporary-account governance.
- Add invitation and approval records.
- Add richer ticket taxonomy and lifecycle.
- Add ticket comments, internal notes, attachments, and history tracking.
- Add requester confirmation rules for closure.
- Add asset assignment history and archival behavior.
- Add notification preferences and delivery events.
- Add SLA policy storage and escalation logic.
- Add clearer department-scoped permissions.

### Future possibilities

- SSO with organization identity provider
- MFA for privileged users
- Knowledge base and self-service help articles
- Preventive maintenance scheduler automation
- Dashboards by department head or ICT manager
- Attachment scanning and retention policies

## Non-functional requirements

- Role and department access must be enforced server-side.
- The system should preserve a complete historical trail.
- Reports should support pagination and export for larger datasets.
- APIs should return predictable error shapes and validation errors.
- Sensitive actions should be auditable.
- The design should support growth beyond the current prototype dataset.

## Security requirements

- No unrestricted public registration in the target design.
- Employees should use approved organization email domains.
- Temporary users must be created or approved by administrators.
- Passwords must remain hashed with bcrypt or stronger approved hashing.
- JWT secrets must stay in environment configuration, not source control.
- Role checks must be enforced in backend routes, not only the frontend.
- Sensitive account changes must write audit events.
- Department visibility rules must not rely on hidden UI alone.

## Reporting requirements

- Dashboard summary for tickets, assets, and technicians
- Ticket reports by status, category, department, priority, and SLA
- Asset reports by type, status, department, custodian, and lifecycle state
- Maintenance reports by asset, technician, cost, and schedule
- Export capability for operational datasets

## Audit requirements

- Record authentication success and administrative account changes
- Record ticket assignment, status changes, closure, and reopening
- Record asset creation, update, assignment, retirement, and disposal
- Record department, role, and permission changes
- Preserve actor, action, record type, record id, timestamp, and meaningful detail

## Assumptions

- The repository is a prototype rather than a production system.
- The provided code is the best available current-state source.
- The organization has official email domains but they were not provided.
- Some terminology such as "ICT officer" and "technician" is organizationally distinct.
- Temporary workers require limited-duration access.

## Risks

- Current public registration conflicts with the target internal-only access model.
- Current schema is too small for the requested lifecycle and audit depth.
- Current API uses direct delete for assets, which risks history loss.
- Department visibility is inconsistent and mostly not enforced in backend queries.
- Missing migrations mean the current database evolution history is not preserved.
- No automated tests are present to protect refactoring.

## Dependencies

- PostgreSQL as the primary database
- Node.js and Express backend
- JWT-based authentication
- Administrative confirmation of organization-specific policies
- A future decision on notifications, file storage, and identity provider

## Gap summary

| Topic | Current state | Target need |
|---|---|---|
| Registration | Public self-registration | Controlled employee and invitation-based onboarding |
| User model | Role only | User type plus system role |
| Ticket workflow | Basic status updates | Governed lifecycle with notes, history, SLA, and closure rules |
| Asset history | Current assignment only | Full assignment and lifecycle history |
| Notifications | Not implemented | Configurable alerts and preferences |
| Audit depth | Basic action logging | Broader event coverage and normalized event types |
| Data retention | Hard deletes present | Archive or soft-delete for key entities |
