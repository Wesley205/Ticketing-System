# UI Refactor Phase 1 Inventory

Date: 2026-08-30

## Current frontend architecture

- Static multi-page frontend under `frontend/`.
- Shared browser helpers in `frontend/js/api.js` and `frontend/js/layout.js`.
- One HTML document per feature page with inline rendering and inline event handlers.
- Shared styling concentrated in `frontend/css/style.css`, with some page-local `<style>` blocks.
- No frontend build step, bundler, component framework, or dedicated browser test runner.

## Component inventory

| Pattern | Current locations | Current variations | Recommended shared API | Behavioral risks |
| --- | --- | --- | --- | --- |
| Auth shell | `index.html`, `register.html` | shared wrapper, per-page copy and form submission | keep page markup; centralize only tokens and feedback helpers | low risk |
| App shell and nav | all protected pages via `layout.js` | page title, subtitle, route guard | preserve `renderLayout(activeKey, title, subtitle)` | low risk |
| Toolbars and filters | dashboard, assets, maintenance, staff, reports, service requests, audit log, knowledge base | buttons on right, filters on left, optional checkboxes | shared CSS only | low risk |
| Table panels | assets, staff, reports, maintenance, technician, departments, audit log, service requests | empty rows vs external empty state blocks | `UiTables.renderBody(bodyId, emptyId, rowsHtml, emptyMessage)` | medium risk if column counts change |
| Empty/info states | most pages plus `api.js` page-state helper | inline text blocks, `empty-state`, `detail-empty`, muted copy | `UiStates.*` plus existing `renderPageState` | low risk |
| Feedback boxes | login, register, assets modal, staff modal, service request create modal, maintenance modals, departments modal | mostly `error-box`, some direct `alert()` usage | `UiFeedback.clearBox/setBox` | low risk |
| Modals | assets, maintenance, staff, technician, departments, service requests, notifications | repeated open/close logic and `classList` toggles | `UiModals.open/close` | low risk |
| Badges | dashboard chips, assets, staff, technician, maintenance, reports, service requests | status and priority badge markup duplicated inline | `UiBadges.renderStatus/renderPriority/renderBadge` | low risk |
| Detail panels | service requests, knowledge base, departments detail modal | KPIs, metadata grids, stacked cards | shared CSS primitives in `components.css` | medium risk if selectors change |
| Permission-aware actions | staff, assets, dashboard filters, service requests | inline template checks against `hasPermission()` | `renderWhenPermitted` and `isActionAllowed` | medium risk if backend permission names drift |

## Reference implementation choice

`frontend/service-requests.html` is the best Phase 1 reference because it combines:

- list and detail layouts
- create and assignment modals
- permission-aware actions
- comments, attachments, and knowledge suggestions
- loading, empty, and error states

## Role requirements recorded

- Staff: create tickets, view own or scoped tickets, comment where allowed, upload allowed attachments, view linked knowledge suggestions.
- Technician: see assigned workload, add internal notes when permitted, update workflow for assigned records, view secure attachments and history within assignment scope.
- ICT Officer: assign and reassign tickets, update workflow, manage internal notes, view broad operational history, use knowledge suggestions.
- Administrator: same operational access as ICT Officer plus broader oversight consistency with admin portal navigation and staff management.

## Behavioral conflicts discovered but not changed

- `about.html` still documents several limitations that no longer match the implemented backend and frontend.
- Multiple pages still rely on `alert()` for operational errors.
- Pages still mix shared CSS with page-local `<style>` blocks.
- Many pages still use inline `onclick` handlers and string-built HTML.
- `api.js` stores JWTs in `localStorage`; this phase does not change auth storage.

## Phase 1 output

- Added a token file so current design values have a dedicated source of truth.
- Added shared component CSS for reusable detail-list and service-desk structures.
- Added small no-build JS primitives for permissions, badges, modal state, feedback, tables, and page states.
- Refactored only `service-requests.html` to consume the shared primitives while preserving existing backend contracts and DOM IDs.
