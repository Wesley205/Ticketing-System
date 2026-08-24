# Organization And User Model

## Scope

This document defines the target identity structure for the NSC ICT Service Desk.

Confirmed current model:

- one `users` table
- one `role` column with values `admin`, `ict_officer`, `technician`, `staff`
- optional department assignment
- active or inactive status

Missing from the current model:

- user type
- sponsor or supervisor
- invitation approval tracking
- temporary account expiry

## Design principle

The target system should separate:

- user type: the person's relationship to the organization
- system role: the permissions granted inside the system

One person has one user type and at least one active system role. Phase 1 can start with one primary role per user if multi-role support is too large for the immediate implementation, but the data model should not block future role expansion.

## User types

| User type | Email requirement | Account creation method | Approval requirement | Default permissions | Expiration behavior | Sponsor/supervisor requirement |
|---|---|---|---|---|---|---|
| Employee | Must use approved organization email domain | Employee self-activation or admin provisioning | Standard approval based on organization policy | Can submit and track own tickets | No default expiration | Not required by default |
| Intern | May lack organization email | Admin-created or invitation-based only | Required | Limited to approved department scope | Mandatory start and end dates | Required |
| Corper | May lack organization email | Admin-created or invitation-based only | Required | Limited to approved department scope | Mandatory start and end dates | Required |
| Contractor | May lack organization email | Admin-created or invitation-based only | Required | Limited to approved department scope | Mandatory start and end dates | Required |
| Guest | Proposed only if a real business case exists | Admin-created only | Required | Very restricted | Mandatory short-term expiry | Required |

## Current versus target onboarding

| Topic | Current | Target |
|---|---|---|
| Registration | Public `POST /api/auth/register` | No unrestricted public registration |
| Employee onboarding | Any valid email accepted | Restricted to approved domains or approved identity provider |
| Temporary users | Not modeled | Invitation or admin-created, with sponsor and expiry |
| Approval record | None | Required for temporary users |

## System roles

### Staff

| Topic | Definition |
|---|---|
| Responsibilities | Submit requests, track progress, confirm resolution when required |
| Allowed actions | Create ticket, view own tickets, comment on own tickets, view assigned assets if permitted |
| Restricted actions | Cannot assign tickets, manage assets globally, manage users, view all reports, or view audit logs |
| Department visibility | Own department only where department-level visibility is granted |
| Asset permissions | View assets assigned to self or department if approved |
| Ticket permissions | Own tickets; department tickets only if explicitly approved |
| Reporting permissions | Personal or department summary only if approved |
| Audit-log permissions | None |

### Technician

| Topic | Definition |
|---|---|
| Responsibilities | Accept, work, update, and resolve assigned technical work |
| Allowed actions | View assigned queue, update ticket status, add work notes, log maintenance work |
| Restricted actions | Should not manage users or global system settings |
| Department visibility | Assigned tickets plus approved department visibility |
| Asset permissions | View and update assets involved in assigned work; no unrestricted deletion |
| Ticket permissions | Update assigned tickets; reopen only under policy |
| Reporting permissions | Personal workload and resolution metrics |
| Audit-log permissions | None by default |

### ICT Officer

| Topic | Definition |
|---|---|
| Responsibilities | Triage, assign, supervise technicians, manage assets and maintenance |
| Allowed actions | View broader ticket queue, assign and reassign work, adjust priority, manage assets, view operational reports |
| Restricted actions | Should not have unrestricted system administration unless explicitly delegated |
| Department visibility | Cross-department or configured operational scope |
| Asset permissions | Create, update, assign, retire, and review history |
| Ticket permissions | Full operational ticket management except privileged administration tasks |
| Reporting permissions | Operational and departmental reports |
| Audit-log permissions | Read operational audit logs if policy permits |

### Administrator

| Topic | Definition |
|---|---|
| Responsibilities | Manage users, departments, permissions, settings, and governance |
| Allowed actions | Full administrative control, account lifecycle management, policy changes, audit review |
| Restricted actions | None inside approved policy scope |
| Department visibility | All departments |
| Asset permissions | Full lifecycle oversight |
| Ticket permissions | Full oversight and exception handling |
| Reporting permissions | Full reports and exports |
| Audit-log permissions | Full access |

## Proposed additional roles

These are proposed, not confirmed.

| Proposed role | Why it may be needed | Recommendation |
|---|---|---|
| Department Head | Useful for department-wide visibility and closure approval without full admin rights | Consider if departments need supervisory reporting |
| ICT Manager | Useful if ICT officers need operational separation from governance | Consider if there is a clear leadership tier |
| Request Approver | Useful for access requests, procurement, or sensitive changes | Consider if approval workflows are required |
| Asset Custodian | Useful when departments own physical asset control | Consider if assets are signed in and out locally |

## Recommended target user fields

### Confirmed current fields

- `user_id`
- `full_name`
- `email`
- `username`
- `password_hash`
- `role`
- `department_id`
- `phone`
- `is_active`
- `created_at`
- `updated_at`

### Proposed additional fields

- `user_type`
- `employment_status`
- `supervisor_user_id`
- `sponsor_name` or `sponsor_user_id`
- `account_start_date`
- `account_expiration_date`
- `last_login_at`
- `deactivated_at`
- `deactivation_reason`
- `invitation_id`

## Recommended target invitation model

Proposed invitation records should capture:

- invitation identifier
- invitee name and email
- intended user type
- intended role
- department
- sponsor or supervisor
- inviter
- invitation status
- sent date
- accepted date
- expiry date

## Policy recommendations

- Employees should not be able to choose privileged roles during onboarding.
- Temporary users should always have explicit expiry dates.
- Expired temporary users should be automatically deactivated.
- Sponsors or supervisors should be visible on the user record.
- Role changes should be auditable.
- Department changes should be auditable.

## Open points carried into Phase 1 decisions

- official employee email domains
- whether employees can self-activate or must be pre-provisioned
- whether multi-role accounts are required now or later
- whether department heads need separate access rights
