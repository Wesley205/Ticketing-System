# Phase 1 Summary

## Current system

The current repository is a small full-stack prototype with:

- Express backend and PostgreSQL schema
- static frontend pages
- role-based access using four roles
- asset management, service requests, maintenance, reports, and audit logs

Confirmed modules:

- authentication
- dashboard
- departments
- staff
- service requests
- assets
- maintenance
- reports
- audit logs

## Target system

The target system is a safer internal ICT service platform with:

- controlled onboarding instead of public registration
- user type separate from system role
- temporary-user expiry and sponsor tracking
- governed ticket lifecycle with comments, notes, attachments, and SLA
- stronger department-scoped permissions
- asset assignment history and archive-first lifecycle
- broader audit and reporting coverage

## Major gaps

| Area | Gap |
|---|---|
| Identity | No user type, invitation, sponsor, or expiry model |
| Registration | Public self-registration conflicts with internal-only requirement |
| Ticketing | No comments, notes, attachments, history, reopen, cancellation, or SLA |
| Permissions | Several read endpoints expose more data than target policy allows |
| Assets | Hard delete and no assignment history |
| Notifications | No notification model or preferences |
| Schema evolution | No migration history directory |
| Testing | No automated tests present |

## Confirmed requirements

- The system must support internal issue reporting and ICT workflow management.
- The system must support role-based access.
- The system must retain history for governance and accountability.
- The organization needs asset and maintenance tracking.
- Administrators need reports and audit visibility.

## Proposed requirements

- Introduce `user_type` and temporary account governance.
- Restrict onboarding to employees and approved invitees.
- Add ticket lifecycle governance and SLA rules.
- Add asset assignment history and archive behavior.
- Normalize API behavior, validation, and pagination.

## Recommended implementation order

1. Identity and access redesign
2. Schema additions for invitations, ticket history, and asset assignments
3. Ticket lifecycle and API hardening
4. Asset lifecycle and archival changes
5. Notifications, SLA, and reporting expansion
6. Cleanup of deprecated endpoints and workflows

## Highest-risk areas

- Replacing public registration without breaking onboarding
- Enforcing department-scoped permissions safely
- Migrating to richer ticket lifecycle without losing current records
- Replacing hard delete with archive while preserving admin workflows

## Required stakeholder decisions

- approved email domains
- temporary account policy
- SLA targets
- notification and attachment providers
- final closure and reopening policy
- disposal and retention policy

## Recommended next phase

Phase 2 should focus on:

- approved target schema migrations
- controlled onboarding and user-type support
- backend permission hardening
- ticket history and lifecycle implementation
- asset assignment history and archive-first asset management
