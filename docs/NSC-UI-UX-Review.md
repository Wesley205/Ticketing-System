# NSC ICT Ticketing System — UI/UX Experience Map

Review date: 9 September 2026  
Source: `C:/Users/DELL/Downloads/nsc-ict-system`  
Method: manual source review of the active React routes, screens, components, hooks, API integrations, backend permissions, validators, and workflow rules. No application code was changed. No automated static analysis, test suite, or authenticated browser walkthrough was run.

## 1. Task

Review the whole NSC system and map its roles, navigation, screens, forms, end-to-end journeys, state handling, cross-module handoffs, and UX gaps.

The supplied LocalFinda context and constraints remain the standing instructions. This target is a separate React 18/Vite web application with React Router, React hooks/context, Express, and PostgreSQL; Flutter, Riverpod, LocalFinda branding, and mobile-native implementation conventions do not describe it. Relevant guardrails applied here: preserve authorization and feature boundaries; protect secrets; avoid unrelated changes; inspect existing patterns before recommending replacements; consider responsiveness, accessibility, performance, and clear loading/error/empty states. The explicit prohibition on static analysis takes precedence over the earlier instruction to run `flutter analyze`.

## 2. Solution — current experience

### Reading this map

- **Implemented:** supported by current source; runtime success is not implied.
- **Mismatch:** two parts of the implementation disagree, creating an identifiable UX failure path.
- **Backend-only:** service/API capability exists without a corresponding active React experience.
- **Recommended:** proposed future behavior, not an existing feature.

The active interface lives in `frontend/src`. The HTML pages in `docs/archive/static-frontend` are historical material, not additional current screens. Some documentation and route descriptions still describe migration phases; the actual route components take precedence.

### System overview

The product combines an internal service desk, technician workspace, asset register, maintenance management, staff administration, knowledge base, operational reporting, and audit oversight. It supports four actual roles. Employee, intern, corper, contractor, and guest are **account types**, not additional permission roles.

The core experience is:

```text
Administrator provisions account or invitation
  → User activates/signs in
  → Dashboard
  → Search knowledge base or submit a ticket
  → ICT officer/administrator assigns technician and expected completion
  → Technician accepts, investigates, communicates, and resolves
  → Requester confirms closure or reopens [current UI permission mismatch]
  → Managers review operational reports and audit history

Supporting loop:
Asset registration → assignment → ticket/maintenance linkage
  → maintenance execution → return/status/history updates
```

### Role and access map

Default roles are shown below. Explicit backend permissions and record-level checks can further affect access. A visible sidebar item does not prove access to its underlying records.

| Area | Staff/user | Technician | ICT officer | Administrator |
|---|---|---|---|---|
| Dashboard | Scoped metrics | Scoped metrics | Organization metrics and global filters | Organization metrics and global filters |
| Ticket list | Own tickets by default | Assigned tickets in list scope | All operational tickets | All operational tickets |
| Create ticket | Yes | **Button visible; backend denies by default** | Yes | Yes |
| Assign/reassign tickets | No | No | Yes | Yes |
| Execute ticket work | Comments/evidence; requester closure/reopen intended | Assigned-ticket transitions and internal content | Operational control | Operational control |
| Requester close/reopen | **UI blocks despite transition support** | Depends on requester/assignee workflow rules | Available within lifecycle | Available within lifecycle |
| Technician portal | Hidden | Available | Hidden | Hidden |
| Assets | Own-assigned or department-visible assets | Own-assigned or department-visible assets; management UI hidden | Register/edit/assign/return | Same, plus delete |
| Maintenance | Route hidden | Assigned or department-visible records; own-work update rules | Manage records and schedules | Manage records and schedules |
| Staff directory | **Server access profile exposes route; directory API denies** | **Same mismatch** | Read directory | Account management and invitations |
| Departments | Own department where applicable | Own department where applicable | Organization view | Create/edit and organization view |
| Knowledge base | Published articles visible to user | Published general, department, and operational articles | Manage articles | Manage articles |
| Reports / audit logs | Hidden | Hidden | Available | Available |
| About / Foundation | Available when authenticated | Available | Available | Available |
| Notification inbox/preferences | No active React UI | No active React UI | No active React UI | No active React UI |

Important scope distinctions:

- `department_supervisor` is an access-profile/heading label derived from department membership; it is not a fifth role. It does not automatically grant staff organization-wide or department-wide ticket permissions.
- Backend `can_access_staff_portal` is true for authenticated users, while the frontend fallback limits it to operational managers. Normalizing the actual server profile overrides that fallback and exposes a dead-end directory to staff/technicians.
- The technician maintenance fetch uses the general maintenance endpoint. Backend visibility includes assigned **or same-department** maintenance; the frontend does not filter these rows again by assignee. Consequently, an “Assigned Maintenance” queue can contain department work the technician cannot update.

### Complete route inventory

There are **19 explicit page routes**, plus the root redirect and wildcard fallback: four authentication/access pages, twelve protected top-level pages, and three protected detail routes.

| Route | Experience | Main exits / actions |
|---|---|---|
| `/` | Session loading, then login or dashboard redirect | `/login`, `/dashboard` |
| `/login` | Marketing/status panel beside sign-in form | Sign in; activate invitation |
| `/activate?token=…` | Invitation acceptance; token can prefill from URL | Activate → dashboard; return to login |
| `/unauthorized` | Authentication-required page | Login, carrying requested destination where supplied |
| `/forbidden` | Signed-in access-denied page | Dashboard; requested route shown where supplied |
| `/dashboard` | Role-aware overview, filters, metric cards, charts | Apply/reset filters; sidebar navigation |
| `/foundation` | Shared-component demonstration | Demo buttons, forms, states, tables, dialogs, toasts |
| `/service-requests` | Filtered ticket table plus first-row detail preview | New ticket, open detail, assignment, inline workflow |
| `/service-requests/:ticketId` | Full ticket detail | Status, comments, evidence, assignment, asset link; back |
| `/technician` | Work queues for tickets and maintenance | Active/Pending Resolution/Completed; open work item |
| `/technician/work/:itemType/:itemId` | Ticket or maintenance execution | Submit workflow/resolution, ticket comments/evidence, back |
| `/assets` | Asset registry and filters | Register, open, edit, assign/reassign, return, delete |
| `/assets/:assetId` | Asset detail and lifecycle | Edit, assign, return, delete; open linked ticket; back |
| `/maintenance` | Maintenance records and preventive schedules | Create/edit record, complete, create/edit schedule |
| `/staff` | Directory, selected person, invitations for admin | Create/edit, activate/deactivate, extend, invite/revoke |
| `/departments` | Directory and selected department | Search, inspect members/assets/tickets, admin create/edit |
| `/knowledge-base` | Searchable list and selected article | Open article, feedback, create/edit where permitted |
| `/reports` | Filtered summaries/charts/detail tables | Apply/reset, paginate, export requests/assets CSV |
| `/audit-logs` | Read-only filtered records | Filter, reset, limit, refresh |
| `/about` | Purpose, features, stack, limitations, database/deployment information | Sidebar navigation |
| Unmatched path | Silent redirect through `/` | Dashboard or login; no dedicated not-found page |

Additional navigation states:

- `/knowledge-base#article-<id>` loads a selected article on initial page entry. Selection writes the hash, but no hash-change listener synchronizes subsequent browser Back/Forward changes.
- `/assets/:assetId?return=1` initializes the return dialog, used by registry Return actions.
- Staff and department selections are local component state, without dedicated person/department detail URLs.
- Maintenance editing uses local dialogs; the technician work route is the available dedicated maintenance work view.
- Unrecognized technician `itemType` values are treated as ticket views rather than rejected as invalid routes.

### Global layout and interaction model

Desktop uses a 260px green sidebar and a flexible content column. The sidebar contains brand, a flat permission-filtered navigation list, and active-route styling. The topbar includes a title/subtitle, phase label, current user and role, logout, and a static “React frontend active” card. Many pages add another hero heading below it.

The visual tokens use deep/bright green, mint, amber, off-white backgrounds, white cards, rounded corners, and soft shadows. Typography names are Space Grotesk, Inter, and IBM Plex Mono, loaded from Google Fonts with local fallbacks. This is NSC’s current visual language; it is not the LocalFinda token system.

Below 960px, the shell and many content grids become one column. The sidebar becomes a top block and retains the vertical navigation list. There is no compact menu/drawer control in `Sidebar`. Table containers provide horizontal scrolling. This implements basic reflow, but a long menu precedes the content on phones. Actual device layout, touch sizes, zoom, and contrast remain unverified.

### Journey A — access, invitation, session recovery

1. An administrator opens Staff and chooses Issue Invitation, or directly creates an account.
2. Invitation input includes full name, email, preferred username, role, account type, department, invitation validity in days, account start/expiry dates, sponsor, and supervisor ID. Temporary invitations require expiry and sponsor.
3. Success keeps the invitation modal open and displays the returned activation URL in a read-only textarea for manual delivery. Creating an invitation is not proof that an email was delivered.
4. The recipient opens `/activate` with a token or pastes one, supplies username, optional phone, and password, and submits.
5. Activation establishes a session and navigates to Dashboard. Validation/API errors remain on the form.
6. Returning users sign in with email/username and password. Both are required; submission changes the button label and disables it.
7. Protected navigation stores a return destination and redirects anonymous users to Login. Missing permissions lead to Forbidden. Active users visiting Login/Activate are redirected to Dashboard.
8. Startup validates a stored session through `/auth/me`. An initialization failure marks the user unauthenticated; the UI does not distinguish a temporary connection failure from invalid credentials in that path.
9. Logout attempts the server request and clears local session state even if that request fails.

Missing user experiences: forgotten-password/reset flow, self-service profile/settings, invitation resend/status recovery for the recipient, and an explicit account-expiry help journey. Login directs users to an administrator but does not provide a concrete contact action. Activation advertises a six-character minimum; backend password policy must be reconciled before changing that guidance.

### Journey B — dashboard and task discovery

Dashboard is the shared landing destination for all roles, including technicians. Its heading and scope labels vary with the access profile.

Filters: From/To dates, category, ticket type; department and technician filters for users allowed global reporting. Users edit draft filters, then Apply or Reset.

Content:

- Operational snapshot: total, pending, active work, resolved, overdue, escalated requests.
- SLA/maintenance: response and resolution compliance, average resolution hours, maintenance records/cost/due schedules.
- Assets: total, active, available, assigned, under maintenance, damaged/retired.
- Distributions: tickets by status/priority, assets by status, technician workload.

There are 18 metric cards. They are informational cards rather than actionable queue links. Staff still receive a large operational layout, and a scoped-out workload panel remains present. The primary task is reached through the sidebar; there is no prominent requester “Get help” action or technician “Continue work” action on this page.

### Journey C — requester help and ticket submission

Entry: Service Desk → New Ticket, or Knowledge Base → search/read article.

Ticket creation is one modal with:

| Field group | Current input |
|---|---|
| Classification | Incident, Service Request, Access Request, Maintenance Request, Change Request |
| Category | Computer, Network, Printer, Internet, Software, Email, Hardware, Other; optional subcategory |
| Severity | Priority, impact, urgency: Low/Medium/High/Critical |
| Problem | Required subject and description |
| Equipment | Optional affected asset selection |
| Closure | Require requester closure confirmation checkbox |
| Self-help | Suggested knowledge articles based on the entered text |

Suggestions wait 300ms and start after sufficient subject/description text. Up to five articles can be requested; each presents title, summary, category, helpful count, score, and Open Article. Suggestion/asset lookup failures silently fall back to empty arrays, so “no matches” can actually mean lookup failure.

On success, the form resets, a toast names the ticket, and the user navigates to its detail route. On failure, the modal stays open with entered values and an error. Files are uploaded after creation in ticket detail; they are not part of the creation form.

Opening a suggested article uses full navigation away from the creation screen. No persistent draft or unsaved-change guard was found, creating a risk of losing the ticket being composed.

### Journey D — ticket triage, assignment, and follow-up

The workspace supports search, type, category, priority, status, and Only my tickets. Local search and pagination operate on loaded rows; page size defaults to eight. The list and full detail are separate navigable presentations.

The adjacent preview automatically chooses the first ticket on the current page. It is not a user-controlled master/detail selection despite “Select a ticket” copy. Filtering or changing pages changes which ticket appears there.

Ticket detail contains:

- Ticket number/subject, status, priority, type.
- Requester, technician, department, created date, expected completion, escalation count.
- Category/subcategory, impact/urgency, source channel, linked asset, first response, SLA response/resolution deadlines, assigned-by identity.
- Description, asset-link controls, knowledge suggestions, workflow form.
- SLA policy and overdue flags, assignment history, comments/internal notes, attachments, full timeline.

Assignment is available to ICT officers/admins: choose technician or Unassigned, expected completion date/time, and assignment note; save, refresh, and display success. Reassignment reuses this modal. Selection offers names without in-dialog workload/capacity context.

Status updates use backend-supplied allowed transitions, status note, and resolution. Comments support public discussion and permission-controlled internal notes. Upload accepts one file per operation, with an internal flag for permitted users. The interface lists PDF, PNG, JPG, WEBP, TXT, DOCX, XLSX; downloads use a browser Blob. No upload progress, inline preview, visible file-size ceiling, or attachment-delete control appears in this component.

The asset-link selector is generally shown in the service-desk detail without a record-specific edit permission gate. Its `defaultValue` does not reset when a reused preview changes tickets; this can leave a selection out of sync with the displayed ticket. Save failures also lack the local error handling present in the main form components.

### Ticket lifecycle — actual transition graph

| Current state | Allowed next states before actor filtering |
|---|---|
| New | Pending, Assigned, Cancelled |
| Pending | Assigned, Cancelled |
| Assigned | Accepted, In Progress, Cancelled |
| Accepted | In Progress |
| In Progress | Waiting for User, Waiting for Parts, Resolved |
| Waiting for User | In Progress |
| Waiting for Parts | In Progress |
| Resolved | Closed, Reopened |
| Closed | Reopened |
| Reopened | Assigned |
| Cancelled | None |

Managers can operate within this graph. Assigned technicians can move into Accepted, In Progress, the two waiting states, and Resolved. Requesters have lifecycle support for closing a resolved ticket and reopening a resolved/closed ticket.

**Broken requester handoff:** `buildTicketPermissions` sets `can_update_status` using the general update permission, which staff lack, even when their `allowed_status_transitions` contains Closed/Reopened. `TicketStatusUpdate` suppresses the whole form when that boolean is false. Consequently, the intended requester confirmation/reopen experience is not available through this UI. It needs an action-specific permission presentation, with backend enforcement preserved.

### Journey E — technician execution

Entry: Dashboard → Technician sidebar item → Active, Pending Resolution, or Completed queue → ticket/maintenance work item.

The workspace shows open/completed ticket and maintenance counts, separate searches, and maintenance status filtering. Tabs filter loaded records. “Pending Resolution” includes Accepted, In Progress, Waiting for User, Waiting for Parts, and Resolved. “Completed” includes cancellation; cancelled tickets are excluded from the completed-ticket KPI, causing a possible count/list discrepancy.

Ticket work uses the shared ticket detail, with its ordinary workflow section replaced by a resolution form. The form has target status, time spent, diagnosis, root cause, and resolution summary. It requires a resolution summary for **every** status submission, including acceptance or starting work. Diagnosis/root cause/time are concatenated into a note rather than stored as separate structured fields by this UI.

Maintenance work adds problem, asset, technician, cost, schedule dates, notes, action taken, completion notes, and a derived created/started/completed timeline. Its execution form offers Scheduled/In Progress/Completed/Cancelled; it does not provide an interactive checklist in this work view. The timeline is assembled from record timestamps, not presented as a full independent maintenance audit log.

Both queues are loaded together with `Promise.all`; a failure can clear both, hiding successfully available work. The workspace also renders empty queues while its loading indicator is present. Separate queue states would communicate availability more accurately.

### Journey F — asset lifecycle

Entry: Assets → search/filter → register or open asset.

Registry filters: search, status, asset type, department. Rows show asset tag, type, brand/model, department, assigned person, status, condition, and role-gated actions.

Register/Edit fields: tag, type, brand, model, serial number, purchase date, department, assigned staff, condition, status, assignment notes, expected return, location, description. Tag and type are validated. Success opens/refreshed detail depending on entry context.

Assignment/Reassignment dialog: staff member or Unassigned, assignment notes, expected return date/time. Return dialog: return notes, returned condition, target status or Automatic.

Asset detail combines identifying information, current ownership, linked tickets with navigation, maintenance history, assignment history, and status history. Maintenance history entries do not link to a maintenance detail experience.

Status vocabulary: Active, Available, Assigned, Under Maintenance, Damaged, Retired. These are supported labels, not a claim that every transition is valid.

**Return mismatch:** the dialog offers New/Good/Fair/Poor; backend return validation accepts Good/Fair/Poor/Damaged. New is rejected, and Damaged cannot be selected as the return condition.

Admin delete invokes the operation immediately from list/detail. The shared confirmation component exists, but this workflow does not use it. There is no undo affordance.

### Journey G — maintenance planning and completion

The page presents Maintenance Records and Preventive Schedules as parallel work areas.

| Operation | Inputs / behavior |
|---|---|
| Find records | Search, status, asset; refresh |
| Create/edit record | Asset, problem, action taken, type, status, technician, date, cost, schedule, start/next-due dates, related ticket ID, asset-status override, checklist, completion notes, notes |
| Complete record | Row action sends existing/default action and completion notes, plus existing checklist |
| Find schedules | Search, asset, active/inactive state |
| Create/edit schedule | Asset, title, description, preventive/inspection type, frequency unit/value, next due, technician, reminder days, active state, checklist |

Record types: Corrective, Preventive, Inspection. Schedule recurrence: days, weeks, months. Record states: Scheduled, In Progress, Completed, Cancelled.

Technicians can access records and create permitted maintenance; only managers have schedule-edit controls. Record Edit/Complete visibility uses a broad maintenance permission, though backend updates are limited to a technician’s own assigned records. Department-visible rows can therefore offer rejected actions.

Checklist editing uses comma-separated text. Related ticket and other references use raw IDs in parts of the form. Quick completion substitutes generic text such as “Maintenance completed.” rather than asking the operator to review evidence. These choices reduce the quality and clarity of operational handoffs.

Backend monitoring supports due schedules and notification events. No calendar, schedule preview, drag/drop planning board, or manager maintenance-detail route exists in the active route map.

### Journey H — staff and department administration

Staff filters: search, role, user type, department, with local pagination. A row opens a side detail panel. Directory actions are role-gated; admin can create/edit, activate/deactivate, extend temporary accounts, create invitations, and revoke invitations.

Create/edit collects identity/contact details, role, account type, department, account dates, sponsor, and supervisor ID; creation additionally requires password. Invitation status filtering supports pending, accepted, revoked, expired. There is no invitation resend action.

**Temporary extension defect:** Extend submits the existing expiration date, or a fixed `2026-12-31` fallback, without asking for a new date. A success toast can announce an extension that did not move the date forward. Deactivation also supplies a hardcoded verification-oriented reason rather than collecting an administrator’s reason. Activate/deactivate/revoke callbacks lack the local error handling and confirmation used in stronger form workflows.

Departments present a searchable directory and selected detail. Detail shows description and counts, members, assets, and service requests. Admins create/edit department name and description. No department deletion or dedicated membership editor appears; membership is managed through staff records. The related asset/ticket tables are informational and do not provide direct drill-through links.

### Journey I — knowledge discovery and publishing

Entry: sidebar Knowledge Base or article suggestion in ticket creation/detail.

Readers search by text/category, select an article, read summary/body, inspect related asset types/ticket categories and revision history, and mark Helpful/Not Helpful. Initial article deep links use the URL hash. There is no rich-text editor or Markdown renderer in `ArticleDetail`; the body is inserted as text.

Managers can filter by status and create/edit title, slug, summary, body, category, status, visibility, department ID, keywords, related asset types, related ticket categories, and change note. Title/slug/body are required. Statuses are draft, in_review, published, archived. Visibility is all_users, department, operational_only. These are selections within one form; no separate review/approval workspace is present.

Feedback has a success toast, but the page does not pass mutation state into the detail component, leaving buttons enabled during submission. The page supplies a retry callback, but `ArticleDetail` neither accepts nor uses it, so article errors have no Retry button. Hash synchronization handles initial entry only.

### Journey J — reporting and audit oversight

Reports are limited to ICT officers/admins. Draft filters cover date range, department, technician, category, and ticket type; Apply/Reset controls loading. Summaries and charts cover ticket/asset/maintenance operations, departments, technician work, resolutions, and overdue items.

Ticket, asset, and maintenance detail tables have separate server-oriented page state. Requests and assets offer CSV export with export errors and busy state. The maintenance table has no export action. Technician workload and overdue summary tables are presented as single-page sections. Ticket numbers in these report definitions are text rather than detail links.

**Display mismatch:** report tables pass `status` to `StatusBadge` and `priority` to `PriorityBadge`, but the components accept `value`. Priority therefore falls back to Medium instead of showing the row’s priority; status receives no intended value. The department ticket-priority column has the same priority mismatch.

Audit logs offer action text, numeric user ID, From/To dates, a 25/50/100/200 record limit, Reset, and Refresh. This is a bounded read-only result list with no pagination or export controls. Lookup by raw user ID adds friction for nontechnical oversight users.

### Journey K — notifications and supporting pages

Backend notification APIs provide list, unread count, mark one/all read, and get/update preferences. Event types cover ticket assignment/update/resolution/comments/attachments/overdue/escalation, maintenance creation/completion/due, invitations, account expiry, and system events.

**No active React notification feature, route, bell, unread badge, preference page, or notification-driven navigation was found.** Toasts only confirm actions during the current UI session; they are not a persistent inbox. External delivery depends on configured services and was not exercised.

About documents purpose, problems, features, technology, limitations, database/deployment. Foundation is a real protected route exposed to every authenticated role, containing sample forms, feedback, table data, dialogs, and toasts. It is development/demo content in the end-user navigation.

### State and recovery map

| State | Current treatment | Limitation / improvement |
|---|---|---|
| Session validation | Loading screen; redirect after result | Differentiate connectivity failure from expired session |
| Anonymous protected entry | Login with return destination | Preserve unsaved work when expiry happens mid-task |
| Forbidden route | 403 page and dashboard actions | Remove duplicate destination buttons; offer meaningful next step |
| Unknown route | Redirect to root | Add not-found context and recovery |
| List loading | Reusable text/pulse loading component | Not a screen-shaped skeleton; some pages also show empty content |
| List error | Error panel, usually Retry | Several pages also display stale/empty rows without an explicit freshness label |
| Empty list | EmptyState or text fallback | Copy sometimes suggests admin-only actions to read-only users |
| Detail loading/error | Separate state in several modules | Department detail and KB detail lack an effective retry control |
| Form validation | Required fields, local checks, normalized API error | Errors often attached to one field regardless of cause |
| Mutation pending | Disabled submit and changed wording in many forms | Some edit, feedback, and row-action paths omit busy/error handling |
| Mutation success | Persistent dismissible toast, close/refresh/navigate | Toasts do not auto-dismiss or cap their stack |
| Modal dismissal | Close/Cancel/overlay click | No dirty-form guard or pending-submit dismissal protection |
| Offline / slow connection | Generic request failure | No offline workspace, sync queue, or explicit reconnect experience |
| Background changes | Manual refresh or local post-mutation refresh | No notification inbox or visible subscription-based updates |

### Accessibility and responsive assessment

Source-supported strengths: semantic main/nav/header elements, active navigation, form labels for many inputs, visible focus outline, dialog role/name, alert error states, polite live loading/toast regions, text labels alongside statuses, table overflow handling, and a shared responsive breakpoint.

Source-supported gaps:

- The shared modal has no focus trap, initial focus, focus restoration, Escape handler, or background inertness implementation. `aria-modal` alone does not supply these behaviors.
- Multiple pages put a real Button inside an anchor/Link, creating nested interactive controls.
- Several technician search and other controls rely on placeholders instead of explicit accessible labels.
- Form hints/errors are visual spans without an explicit described-by/error association or invalid-state wiring in the shared wrapper.
- The CSS has no detected reduced-motion or dark-mode preference rules; light colors and transitions are the current default.
- Narrow screens retain the full navigation block above task content; long forms and extensive metadata require substantial scrolling.

Contrast, screen-reader output, keyboard order, text scaling, touch-target dimensions, and layout at 320–430px require rendered manual verification. This report does not certify accessibility or frame-rate performance.

### Prioritized findings

High = blocked core journey, misleading operational information, or harmful action UX. Medium = material friction/recovery gap. Low = presentation/organization cleanup. These are review priorities, not measured production incident severity.

| ID | Priority | Finding and user impact | Recommended correction | Source evidence |
|---|---|---|---|---|
| UX-01 | High | Requester cannot close/reopen through the workflow form | Drive visible actions from allowed transitions and action-specific authority | TicketStatusUpdate; serviceRequest.policy; resourceAccess |
| UX-02 | High | Technician New Ticket leads to denied submission | Hide/disable creation using server capability | ServiceRequestsPage; authorization/roles |
| UX-03 | High | Staff/technician directory navigation leads to forbidden API response | Align access-profile route visibility with directory policy | utils/authorization; staff.policy; access.js |
| UX-04 | High | Report status/priority badges do not receive their values | Standardize badge props; verify multiple distinct statuses/priorities | ReportsPage; DepartmentDetailPanel; badge components |
| UX-05 | High | Return condition New is invalid; Damaged missing | Reuse return-condition contract | AssetDetailPage; asset.validator; domain constants |
| UX-06 | High | Extend may resend unchanged expiration date | Ask for a future date and show old/new values | StaffPage onExtend |
| UX-07 | High | Destructive/admin actions execute without review and some failures lack feedback | Use existing confirmation dialog, real reason input, pending/error state | AssetsPage; AssetDetailPage; StaffPage; ConfirmDialog |
| UX-08 | High | “Assigned” maintenance includes department work; controls can be unauthorized | Filter assigned queue; render per-record update authority | technician-api; useTechnicianWork; utils/authorization; MaintenancePage |
| UX-09 | High | No persistent notification experience for handoffs | Add inbox/unread/read state, supported preferences, permission-safe links | router; Sidebar; Topbar; notification.routes |
| UX-10 | Medium | Preview changes implicitly; asset dropdown can retain wrong selection | Explicit selected ticket state; controlled/reset asset field | ServiceRequestsPage; TicketDetail |
| UX-11 | Medium | Resolution required before merely accepting/starting work | Separate Start/Accept actions from Resolve fields | ResolutionForm; WorkExecutionPanel |
| UX-12 | Medium | Modal keyboard behavior incomplete | Add focus management, Escape, and background isolation | Modal |
| UX-13 | Medium | Navigation to suggested self-help risks draft loss | Preserve draft or open article within current task context | TicketCreateModal; KBSuggestions |
| UX-14 | Medium | Generic quick maintenance completion weakens records | Review checklist and require appropriate completion notes | MaintenancePage; MaintenanceFormModal |
| UX-15 | Medium | KB retry, feedback pending state, hash history incomplete | Wire callback/busy state; synchronize URL selection | KnowledgeBasePage; ArticleDetail; useKnowledgeBase |
| UX-16 | Medium | Related information often lacks next-step links | Link department/report rows and maintenance references where authorized | DepartmentDetailPanel; ReportsPage; AssetDetail |
| UX-17 | Medium | Mobile navigation dominates task area | Compact accessible navigation, preserve active context | Sidebar; components.css |
| UX-18 | Medium | Account recovery is administrator-dependent with weak guidance | Add a concrete support/recovery route consistent with auth policy | auth pages; router |
| UX-19 | Medium | Load-all/local pagination and unsynchronized requests risk slow/stale results | Adopt server paging where supported; cancel/sequence searches; isolate queue failures | useTickets; useStaff; useKnowledgeBase; useTechnicianWork |
| UX-20 | Low | Demo page, phase labels, duplicate headings/buttons, static operational status | Remove migration copy from production tasks; distinguish verified health from decoration | FoundationShowcase; router; Topbar; auth/detail pages |

### Recommended experience structure — future state

Keep the existing modules, but group navigation around user goals:

| Group | Destination / emphasis |
|---|---|
| My work | Role-specific Home; My Requests for staff; Assigned Work for technicians |
| Help | Knowledge Base; clear Request Help action |
| Operations | Service Desk, Assets, Maintenance for appropriate roles |
| Administration | Staff & Access, Departments for appropriate roles |
| Oversight | Reports, Audit Logs |
| Shared utilities | Notifications, account/help controls, About |

Foundation should be a development-only destination. Staff Home should prioritize request submission, updates, and confirmation. Technician Home should prioritize actionable work and deadlines. Manager Home should prioritize unassigned/overdue work and capacity, with metric drill-downs. Backend access rules remain authoritative.

### Manual acceptance walkthroughs to complete runtime validation

1. Sign in as each role and verify visible navigation against API access, including Staff and Departments.
2. Open a protected deep link anonymously, sign in, and confirm return navigation; repeat with an expired session and denied role.
3. Activate valid, expired, revoked, and already-used test invitations; verify actionable feedback without exposing tokens in reports.
4. Staff submits a ticket, tries self-help during composition, adds evidence/comment, then closes/reopens after technician resolution.
5. Manager assigns/reassigns/unassigns, sets expected completion, and checks history and queue changes.
6. Technician accepts/starts/waits/resolves; verify form requirements and visibility of public versus internal content.
7. Compare technician assigned maintenance with same-department, other-assignee records; verify update controls.
8. Register/assign/return an asset in every supported return condition; inspect linked tickets and lifecycle history.
9. Edit and complete maintenance with checklist evidence; create recurring schedule and verify due-item behavior in a controlled environment.
10. Admin changes account lifecycle, extends expiry to a later date, and revokes an invitation; verify pending, success, and failure feedback.
11. Read and manage KB articles across each visibility/status; test hash Back/Forward, feedback busy state, and detail retry.
12. Compare reports with source tickets of different priorities/statuses; verify filters, independent pagination, and CSV contents.
13. Simulate slow/offline/failed list, detail, lookup, save, upload, and export requests; ensure unavailable and empty are distinct.
14. Keyboard-test all dialogs, screen-reader labels, 200% zoom, phone-width layouts, long text, and touch controls.

## 3. Notes and evidence

This is a complete **source-level map of the active route surface and its supporting workflows**, not a claim of a completed live usability study. Production data, email delivery, scheduled jobs, browser layouts, and authenticated operations were not exercised. No secrets or environment-file contents were read or included. No NSC source files, deployment files, or database records were changed.

The deliverable is saved in the authorized workspace because the reviewed Downloads repository is outside the writable workspace. Static analysis/linting remains unexecuted per instruction. After remediation, targeted interaction checks should focus first on UX-01 through UX-08, followed by role-based browser walkthroughs and accessibility verification.

### Source index

Paths below are relative to the reviewed repository unless linked. Page names in the findings table refer to these active directories.

- [Routes](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/app/router.jsx>) and [frontend permissions](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/permissions/access.js>).
- [Backend access profile and visibility](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/authorization.js>), [role permissions](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/authorization/roles.js>), and [record-level access](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/authorization/resourceAccess.js>).
- [Ticket lifecycle](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/serviceRequests/serviceRequest.workflow.js>), [ticket UI permissions](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/serviceRequests/serviceRequest.policy.js>), and [domain vocabularies](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/shared/constants/domain.js>).
- [Service desk page](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/service-requests/pages/ServiceRequestsPage.jsx>), [ticket detail](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/service-requests/components/TicketDetail.jsx>), [workflow form](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/service-requests/components/TicketStatusUpdate.jsx>).
- `frontend/src/features/auth/{pages,components,hooks,services}`: authentication, activation, guards, and session handling.
- `frontend/src/features/service-requests/{pages,components,hooks,services}`: forms, filters, assignment, comments, uploads, suggestions, timeline.
- `frontend/src/features/technician/{pages,components,hooks,services}`: queues and execution, especially `ResolutionForm.jsx` and `technician-api.js`.
- [Asset detail/return form](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/assets/pages/AssetDetailPage.jsx>) and [return validator](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/assets/asset.validator.js>).
- `frontend/src/features/assets/{pages,components,hooks,services}`: registry, registration, assignment, and lifecycle.
- [Maintenance page](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/maintenance/pages/MaintenancePage.jsx>); `frontend/src/features/maintenance/components`: record and schedule forms/lists.
- [Staff page](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/staff/pages/StaffPage.jsx>) and [staff API policy](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/staff/staff.policy.js>); `frontend/src/features/staff/components`: invitation and account forms/actions.
- [Department detail](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/departments/components/DepartmentDetailPanel.jsx>); `frontend/src/features/departments`: directory, form, hook, API.
- `frontend/src/features/knowledge-base`: `KnowledgeBasePage.jsx`, `ArticleDetail.jsx`, `ArticleFormModal.jsx`, `useKnowledgeBase.js`.
- [Reports](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/reports/pages/ReportsPage.jsx>), [status badge](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/components/status/StatusBadge.jsx>), [priority badge](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/components/status/PriorityBadge.jsx>).
- `frontend/src/features/dashboard`, `frontend/src/features/reports`, `frontend/src/features/audit-logs`, and `frontend/src/features/info`: remaining screen/filter/state implementations.
- [Notification routes](<C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/notifications/notification.routes.js>).
- [Modal](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/components/modals/Modal.jsx>), [toasts](<C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/components/feedback/ToastProvider.jsx>), `frontend/src/components/forms/FormField.jsx`, and `frontend/src/components/layout`: shared experience primitives.
- `frontend/src/styles/{tokens.css,globals.css,components.css}`: design tokens, typography, focus, responsive layout.
