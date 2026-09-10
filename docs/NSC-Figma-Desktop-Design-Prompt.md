# Prompt: Design the NSC ICT Ticketing System desktop experience in Figma

You are the lead product designer and Figma UI/UX design agent for the NSC ICT Ticketing System. Create a complete, high-fidelity, editable desktop application design and connected prototype. Execute the design work in Figma; do not stop at a plan, written recommendations, or a single dashboard.

## 1. Context and constraints

Use the attached `NSC-UI-UX-Review.md` as the primary requirements reference. It maps the current React/Express application, four roles, 19 explicit page routes, supporting dialogs, backend-only capabilities, and 20 UX findings. Read the entire review before designing. If the file is unavailable, use the detailed requirements below and record that the original review was unavailable.

This is an internal ICT service-management application covering support tickets, technician work, assets, maintenance, staff access, departments, knowledge, reporting, and auditing. The implementation target is React 18/Vite, React Router, Express, and PostgreSQL. Design reusable interfaces that fit this architecture.

The workspace’s standing LocalFinda context and constraints remain applicable where relevant, but LocalFinda’s Flutter/Riverpod architecture, marketplace modules, fonts, and branding do not describe NSC. Preserve the review’s explicit distinction. Do not introduce marketplace, payment, chat-commerce, onboarding, or mobile-native patterns into this desktop ticketing product.

Non-negotiable constraints:

- Preserve existing business concepts, record-level authorization, invitation-only access, and valid ticket transitions.
- Correct the reviewed UX defects in the proposed design. Label implementation dependencies rather than pretending the current application already supports those corrections.
- Use fictional people, departments, assets, tickets, and metrics. Never read, display, or invent actual credentials, invitation tokens, secrets, or personal records.
- Prefer shared components and semantic tokens. Design narrow, predictable updates, paginated tables, loading states, and asynchronous feedback; do not imply live backend integration in a prototype.
- Preserve module boundaries and distinguish user role from account type.
- Keep developer terminology, phase labels, API details, raw permission names, and migration messages out of the product UI. Place implementation notes beside frames.
- Do not run static analysis or linting commands. Do not modify application code, environments, signing, or deployment configuration.
- This request authorizes creation of the Figma design artifact and prototype. Do not publish a website or distribute messages to other people.

## 2. Design objective

Create a clear, professional desktop workspace where:

- Staff can get help, follow requests, provide evidence, and confirm whether an issue is solved.
- Technicians can identify assigned work, start it quickly, communicate, and document resolutions.
- ICT officers can triage requests, allocate work, monitor deadlines, manage assets and maintenance, and inspect reports.
- Administrators can do operational work plus provision accounts, manage organizational records, and review sensitive actions.

Prioritize task completion and readable operational information. Use a restrained institutional identity, strong typography, consistent spacing, and useful information density. Avoid oversized dashboard heroes, decorative charts, excessive gradients, and repetitive cards that push work below the fold.

## 3. Visual direction and desktop layout

Use these existing NSC colors as starting primitives, then create accessible semantic tokens:

| Token purpose | Starting color |
|---|---|
| Primary green | `#0A7D3E` |
| Deep green/navigation | `#063D1F` |
| Secondary green | `#14904A` |
| Mint accent | `#17A594` |
| Amber | `#F5A623` |
| Page background | `#F6F4EF` |
| Surface | `#FFFFFF` |
| Primary text | `#16231A` |
| Secondary text | `#5C6B62` |
| Border | `#E4E0D6` |
| Success | `#1B8354` |
| Danger | `#C1432D` |

Use Inter for body/interface text, Space Grotesk sparingly for headings, and IBM Plex Mono for ticket/asset identifiers. Use available substitutes only when necessary and document them. Use a simple NSC wordmark if an approved logo is not provided; do not invent an official seal.

- Primary desktop viewport: 1440 × 1024. Long pages may scroll within prototype frames.
- Also demonstrate Dashboard, Service Desk, and Ticket Detail at 1280 × 800 and 1920 × 1080.
- Start with a 248–260px sidebar, 64–72px utility header, 24–32px content padding, and an 8px spacing scale.
- Use Auto Layout and meaningful resizing rules for every composed screen.
- Use 14–16px readable body/table text, clear heading hierarchy, 8–12px radii, subtle elevation, and restrained dividers.
- Use comfortable desktop controls; target 44px interactive areas where practical and annotate compact table controls separately.
- Design a complete light theme. Create semantic dark-theme variables and validate them on Dashboard, Ticket Detail, and a modal; full duplicate dark screens are not required.
- Validate text and control contrast; color must never be the only indication of priority, status, error, or selection.

Desktop scope only. Document how the shell contracts at smaller desktop widths without creating a mobile screen suite.

## 4. Roles and navigation

Use one shared shell with permission-specific instances, not four unrelated applications.

| Role | Allowed experience |
|---|---|
| Staff | Personal dashboard, own requests, create request, public comments/evidence, requester close/reopen where valid, visible assets/department, visible published knowledge |
| Technician | Assigned work and scoped dashboard; own-assigned ticket execution and internal notes; visible assets; maintenance execution only on authorized records; visible knowledge. No ticket creation, staff directory, assignment, or manager reports by default |
| ICT officer | Organization dashboard, ticket triage/assignment, assets and maintenance management, staff directory read access, department read access, knowledge management, reports, audit logs |
| Administrator | ICT operational capabilities plus account/invitation management, department management, and asset deletion |

Account types: employee, intern, corper, contractor, guest. `department_supervisor` is not a fifth role. Department membership does not grant broad ticket authority.

Group navigation by user intent: My Work, Help, Operations, Administration, Oversight. Show only permitted destinations. Keep Notifications, account identity/logout, and About available as appropriate shared utilities. Do not include Foundation or a role-switcher in the production navigation; prototype role starting points belong on the Figma cover page.

Retain route mappings in annotations even if menu labels improve, such as “My Requests” for a staff view of `/service-requests`.

## 5. Figma file organization

Create or use one clearly named file: **NSC ICT Ticketing System — Desktop UX**. If an existing project file is supplied, inspect its components and variables before creating duplicates. Follow the available Figma tool/skill prerequisites for file creation and editing.

Organize pages as:

1. `00 — Brief, Coverage & Flows`
2. `01 — Foundations & Components`
3. `02 — Access & Role Dashboards`
4. `03 — Service Desk & Technician Work`
5. `04 — Assets & Maintenance`
6. `05 — Staff & Departments`
7. `06 — Knowledge, Notifications & Oversight`
8. `07 — States, Accessibility & Handoff`

Name frames `Module / Role / Screen / State`. Build components with properties and variants rather than detached copies. Use reusable instances for shell, table, drawer, dialog, and form patterns. Keep all text editable and use native Figma layers; do not deliver flattened screenshots as screens.

## 6. Required screen and overlay inventory

Create every numbered experience below. A dialog or meaningful state variant may be an overlay/component instance rather than a separate full-page screen. Similar screens may share a base component, but role differences must remain inspectable.

### A. Access and account recovery

1. **Sign in** — email/username, password, submitting/error states, invitation activation link, actionable administrator-help guidance. Do not claim the system is operational without verified health data.
2. **Activate invitation** — invitation context/token entry, username, optional phone, password guidance, activation pending/success, invalid/expired/revoked/already-used invitation states. Do not hardcode an unverified password minimum.
3. **Session expired / authentication required** — explain the next step, preserve intended destination and draft context in the proposed behavior.
4. **Access denied** — one clear return action and appropriate help, without revealing protected content.
5. **Not found** — proposed recovery page for invalid routes or missing records.
6. **Account help / expired account** — administrator-mediated guidance. Automated password reset and invitation resend are outside confirmed scope; do not imply they are implemented.

### B. Role dashboards

7. **Staff home** — prominent Request Help, own open requests, requests waiting for input/confirmation, recent updates, useful knowledge links.
8. **Technician home** — assigned queue, SLA/expected deadlines, waiting work, maintenance due, Continue Work action.
9. **ICT officer dashboard** — unassigned/overdue/escalated requests, technician workload, actionable ticket/SLA summaries, asset and maintenance overview.
10. **Administrator dashboard** — operational overview plus account/invitation and organization-management entry points. Flag any new aggregate data dependency.

Use relevant metrics only; preserve access to the review’s full metric set through appropriate sections. Annotate the destination of metric drill-downs. Global filters belong only to authorized users.

### C. Service desk and request lifecycle

11. **Ticket workspace** — role-aware table, search, type/category/priority/status filters, personal scope where relevant, pagination, explicit row selection and selected preview. Show the selected state and a deliberate Open Full Detail action.
12. **Create ticket** — subject, description, type, category/subcategory, priority/impact/urgency, affected asset, closure-confirmation option. Group advanced fields; preserve supported data rather than silently removing it. Provide inline self-help that does not discard the draft. Evidence upload remains a post-creation step unless explicitly annotated as an enhancement.
13. **Ticket created** — ticket number, success feedback, View Ticket, clear next step.
14. **Requester ticket detail** — clear status, next action/owner, expected completion, description, affected asset, public conversation, evidence, and readable history. Show resolved state with Confirm Resolved and Reopen actions where valid. Internal content must not appear.
15. **Operational ticket detail** — shared structure plus assignment, internal notes, SLA response/resolution deadlines, escalation context, linked asset editing where authorized, assignment/full history.
16. **Assign / reassign / unassign** — assignee selector, expected completion, assignment note, confirmation and failure state. Workload context is useful only where data is available; annotate additional dependencies.
17. **Status action overlays** — Accept, Start Work, Waiting for User, Waiting for Parts, Resolve, Close, Reopen, Cancel. Display only the transitions allowed for the actor and current state. Require resolution details when resolving, not merely accepting work.
18. **Conversation and evidence states** — public comment/internal note distinction; upload selection, upload pending/error/success, download action, internal evidence label for authorized users. Show supported types: PDF, PNG, JPG, WEBP, TXT, DOCX, XLSX. Do not invent an upload-size limit.
19. **Related knowledge preview** — readable article within the help/request task; return to the intact draft.

Keep these transitions exact before applying actor permissions:

```text
New → Pending | Assigned | Cancelled
Pending → Assigned | Cancelled
Assigned → Accepted | In Progress | Cancelled
Accepted → In Progress
In Progress → Waiting for User | Waiting for Parts | Resolved
Waiting for User → In Progress
Waiting for Parts → In Progress
Resolved → Closed | Reopened
Closed → Reopened
Reopened → Assigned
Cancelled → terminal
```

Managers operate within this graph. Assigned technicians can accept, start, wait, and resolve. Requesters can close resolved tickets or reopen resolved/closed tickets where authorized. Do not add an approval gate merely because a ticket is an Access Request or Change Request.

### D. Technician execution

20. **Assigned work** — tickets and maintenance, searches, clear queue definitions, accurate counts, independent loading/errors. Separate department-visible work from personally assigned work; do not offer execution on unauthorized rows.
21. **Ticket execution** — task context, Accept/Start controls, public/internal communication, evidence, diagnosis, root cause, time spent, resolution. Annotate that the current implementation combines some values into notes; structured tracking is not confirmed.
22. **Maintenance execution** — asset/problem, schedule, status, checklist, action taken, notes, completion review and timeline. Annotate interactive checklist behavior as a correction/enhancement to the existing interface.

### E. Assets and maintenance planning

23. **Asset registry** — filters, table, ownership/department/status/condition, permitted row actions.
24. **Asset detail** — identity/location, ownership, linked tickets, maintenance history, assignment/status history, actionable links where permitted.
25. **Register / edit asset** — tag/type, brand/model/serial, purchase date, department, assignment, condition/status, assignment notes, expected return, location, description.
26. **Assign / reassign asset** — staff selection, assignment notes, expected return.
27. **Return asset** — return notes, returned condition limited to Good/Fair/Poor/Damaged, target status or Automatic. Show ownership change and outcome.
28. **Delete asset confirmation** — admin-only, identify affected asset, explain confirmed consequences, confirm/cancel and failure handling. Do not invent cascading-deletion behavior.
29. **Maintenance records** — search/status/asset filters, record list, per-record permitted actions.
30. **Create / edit maintenance** — asset, problem, type, technician, status/date/cost, related ticket, schedule/start/next-due fields, checklist, asset-status override, action/completion notes. Use searchable references where lookup data exists; flag missing lookup dependencies.
31. **Preventive schedules** — list, search, asset/state filters, upcoming due context, create/edit actions for managers.
32. **Create / edit schedule** — asset, title/description, preventive or inspection type, recurrence days/weeks/months and frequency, next due, technician, reminder days, active state, checklist.
33. **Complete maintenance review** — checklist/evidence review and meaningful completion notes; no fabricated generic completion claim.

Preserve asset states Active/Available/Assigned/Under Maintenance/Damaged/Retired and maintenance states Scheduled/In Progress/Completed/Cancelled. Do not infer unrestricted transitions from these labels.

### F. Staff, invitations, and departments

34. **Staff directory** — managers only; search, role/type/department filters, pagination, selected account detail.
35. **Account detail** — role/type/department, lifecycle dates/status, administrator actions, read-only officer variant.
36. **Create / edit account** — identity/contact, role/type, department, dates, sponsor/supervisor, password only where appropriate to account creation.
37. **Issue invitation** — identity/email, preferred username, role/type, department, invitation duration, account dates, sponsor/supervisor. Temporary accounts require appropriate sponsor/expiry input.
38. **Invitation list and created state** — pending/accepted/revoked/expired, copy activation link, revoke confirmation. A created invitation must not be labeled Email Delivered without evidence.
39. **Activate / deactivate account** — clear confirmation and real reason input where appropriate, pending/error/success.
40. **Extend temporary account** — existing expiry, selectable later expiry, before/after confirmation. Never use a fixed date or silently resend the existing date.
41. **Departments** — directory with scoped read variants; selected description, members, assets, requests, useful authorized links.
42. **Create / edit department** — admin-only name/description form. No unsupported delete or membership-management workflow.

### G. Knowledge, notifications, reporting, and support

43. **Knowledge search** — search/category filters, published article list, selected article; manager status filters.
44. **Article detail** — title/summary/body, relationships, revision history, helpful/not-helpful feedback, pending/error/retry. Preserve selected article through navigation.
45. **Create / edit article** — title/slug/summary/body/category, draft/in_review/published/archived, all_users/department/operational_only visibility, department, keywords, relationships, change note. Human-readable labels may map to those stored values. Do not add an unsupported approval workflow.
46. **Notification inbox and header preview** — unread count, read/unread, mark one/all read, timestamp, severity, relevant ticket/maintenance/account links. Label this as new UI supported by existing backend APIs.
47. **Notification preferences** — show only settings verified in the backend contract. If that contract is unavailable, create an annotated layout proposal with unverified controls outside the committed design scope; do not imply email/SMS/WhatsApp delivery works.
48. **Reports** — date/department/technician/category/type filters, summaries/charts, workload, overdue records, ticket/asset/maintenance detail tables, independent pagination. Requests/assets CSV export only; maintenance export is not confirmed. Show export pending/error/success.
49. **Audit logs** — read-only action/user/date filters, record limit and clear result scope. A user picker requires a permitted lookup source; retain a documented fallback. No invented edit/delete or unlimited history claim.
50. **About / help** — concise purpose and support guidance. No migration-phase messages, developer showcase, or unverified system-health badge.

## 7. Required components and state coverage

Build tokens and reusable component sets for navigation, breadcrumbs, page headers, buttons/icon buttons, fields/selects/search, date/time inputs, filters, table headers/rows/pagination, metric cards, charts/legends, status and priority badges, tabs, side panels, dialogs, confirmation dialogs, timelines, comments/internal notes, attachments, notification items, toasts, banners, skeletons, and empty/error states.

Provide default, hover, keyboard focus, selected, disabled, loading, error, and success variants where applicable. Use separate semantic status and priority tokens; never render all priorities as Medium.

For every module, map: populated, loading, genuinely empty, filtered-no-results, request failure with Retry, and read-only/permission state. For mutation flows, map validation, submitting, success, failure with preserved input, and safe cancellation. Reuse components, but include realistic in-context state examples rather than an isolated state library only.

Annotate dialog initial focus, focus containment, Escape handling, return focus, background blocking, and unsaved-change behavior. Document keyboard row navigation, accessible names, hint/error associations, non-color status cues, reduced-motion behavior, and high-zoom resizing. Do not claim accessibility compliance solely from visual inspection.

## 8. Connected prototype and sample data

Use a consistent fictional dataset across frames, such as ticket `NSC-2026-00142` for a printer issue, asset `NSC-PRN-014`, a Finance requester, an assigned ICT technician, and a linked troubleshooting article. Use clearly fictional `.example` email addresses. Keep IDs, ownership, dates, SLA deadlines, counts, and statuses internally consistent.

Create named prototype starting points for:

1. **Staff requests help:** sign in → staff home → create ticket → read suggestion without draft loss → submit → ticket detail → comment/upload → resolved notification → confirm closure or reopen branch.
2. **ICT officer triages:** dashboard unassigned metric → filtered desk → select ticket → assign with expected completion → inspect updated ownership/history.
3. **Technician resolves:** assigned queue → Accept → Start → waiting branch → Resume → Resolve with evidence → updated queue.
4. **Asset return:** registry → detail → assign → process return → updated status/ownership/history.
5. **Maintenance:** schedule → record → assigned execution → checklist/completion review → completed record.
6. **Administrator provisions access:** staff → invitation → created/copy state → recipient activation → admin account view → extend expiry or deactivate branch.
7. **Oversight:** report filters → detail rows → export feedback → audit filters.

Show explicit scenario handoff frames when a flow moves between roles. Do not make technician actions appear available in a staff session just to connect the prototype. Use prototype simulation for notifications and time progression; label it in the flow documentation.

Every primary action in these paths must have a meaningful destination or state. Secondary actions outside the prototype must be annotated rather than silently linked to unrelated screens.

## 9. Traceability, scope boundaries, and delivery

Create a coverage table with: requirement/screen ID, original route or proposed entry, role, Figma frame link, related review finding UX-01–UX-20, implementation classification, and dependency.

Classification values:

- Existing capability, redesigned UI.
- Correction to current UI/permission presentation.
- New frontend using existing backend capability.
- Proposed behavior requiring implementation or contract verification.

Explicitly cover all 20 review findings. UX-17 is addressed here through desktop shell contraction and documented future small-screen behavior; do not claim a completed mobile redesign. Keep unverified extras such as automated password resets, invitation resend, SLA-policy administration, real-time infrastructure, global search, bulk actions, calendar planning, and additional exports outside committed scope.

Work in this order: inspect requirements/library → foundations and role shell → core ticket prototype → remaining modules → recovery/state coverage → responsive desktop checks → final visual review and handoff. Continue through the complete inventory; if a tool limitation prevents an item, identify it precisely in the coverage table.

Before delivery, inspect every screen for clipping, overflow, unreadable tables, detached styles, inconsistent actions, unsupported permissions, and missing links. Confirm there are no flattened screen images, development placeholders, duplicate navigation destinations, or unmarked invented functionality.

Deliver:

- Figma file link and links to each role’s prototype starting point.
- Complete editable desktop screen and overlay inventory.
- Shared components, variables, typography, and theme foundations.
- Review-to-design coverage matrix and implementation dependencies.
- Concise handoff explaining corrected workflows, reusable layout behavior, unresolved contract questions, and what was visually verified.

Make reasonable visual decisions without repeated confirmation. Ask only when missing information would materially change permissions or business behavior; continue independent design work while that question is unresolved.
