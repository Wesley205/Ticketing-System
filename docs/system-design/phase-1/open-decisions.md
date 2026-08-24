# Open Decisions

## Purpose

This document records decisions that require stakeholder confirmation. Provisional assumptions are included so planning can continue without pretending they are confirmed.

| Decision | Why it matters | Recommended option | Alternatives | Impact of delaying |
|---|---|---|---|---|
| Official email domains | Determines who qualifies as an employee account | Maintain an approved allowlist of organization domains | Manual approval without domain restriction | Blocks safe employee self-activation |
| SSO provider | Affects login flow and identity assurance | Keep password login initially; evaluate Microsoft Entra ID or Google Workspace later | Continue local auth only | Delays long-term identity hardening |
| VPN or internal-network deployment | Affects exposure and threat model | Prefer internal-only deployment or VPN-restricted access | Public internet with strong controls | Delays security architecture decisions |
| MFA requirement | Affects privileged account safety | Require MFA for administrators and ICT officers in later phase | Password-only | Leaves privileged accounts weaker |
| Organization department list | Needed for clean department governance | Confirm authoritative department master list | Keep current prototype list temporarily | Creates migration and reporting ambiguity |
| Department heads | Needed if department-level visibility or approvals are required | Confirm named department heads later; keep as proposed role now | No department-head role | Delays approval and reporting design |
| ICT officer hierarchy | Determines whether ICT Manager is needed | Confirm whether a manager tier exists | Treat all ICT officers equally | Limits escalation design |
| SLA targets | Drives timers, escalations, and reporting | Use proposed SLA table as a starting point | No SLA automation initially | Blocks meaningful SLA features |
| Notification provider | Needed for email or messaging alerts | Start with in-app notifications only | Email, SMS, WhatsApp, Teams | External notifications cannot be implemented safely |
| File-storage provider | Needed for ticket attachments | Decide between local storage, S3-compatible storage, or cloud drive | No attachments | Blocks attachment feature |
| Temporary account duration | Needed for interns, corpers, and contractors | Require explicit start and end dates per account | Fixed default duration | Risks over-retained access |
| Who can close tickets | Affects lifecycle and accountability | ICT Officer or Administrator; requester confirmation configurable | Technician self-close | Blocks closure workflow design |
| Whether requester confirmation is mandatory | Affects close timing and user experience | Make it configurable, default off initially | Always required or never required | Blocks final status transition rules |
| Asset disposal rules | Needed for retired equipment history | Require disposal method, date, and approving officer | Simple retired status only | Weak asset governance |
| Data-retention period | Needed for audit, tickets, and attachments | Confirm legal or policy retention periods | Keep indefinitely | Blocks archive/purge policy |
| Report access | Affects privacy and leadership visibility | Admin and ICT Officer now; consider Department Head later | Broader access | Delays fine-grained reporting rules |
| Whether contractors are supported | Affects user-type design | Support contractors explicitly if the organization uses them | Exclude contractors | Changes invitation and expiry scope |
| Whether guests are supported | Affects need for a `Guest` user type | Do not support unless a real use case is confirmed | Add guest support | Avoids unnecessary complexity |

## Provisional assumptions

- The organization has one or more official email domains.
- The target system is intended for internal use, not public self-service.
- Temporary workers require sponsored access with expiration.
- Email and attachment infrastructure are not yet approved.
