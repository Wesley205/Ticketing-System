# Static Frontend Audit

Date: 2026-08-30

## Scope

This audit compares the remaining static frontend screens against the verified `frontend/service-requests.html` reference implementation from UI Refactor Phase 1.

Screens inspected:

- `frontend/dashboard.html`
- `frontend/technician.html`
- `frontend/assets.html`
- `frontend/maintenance.html`
- `frontend/staff.html`
- `frontend/departments.html`
- `frontend/knowledge-base.html`
- `frontend/reports.html`
- `frontend/audit-log.html`
- `frontend/about.html`
- `frontend/index.html`
- `frontend/register.html`

Shared files inspected:

- `frontend/css/style.css`
- `frontend/css/tokens.css`
- `frontend/css/components.css`
- `frontend/js/api.js`
- `frontend/js/layout.js`
- `frontend/js/permissions.js`
- `frontend/js/ui/badges.js`
- `frontend/js/ui/feedback.js`
- `frontend/js/ui/modals.js`
- `frontend/js/ui/states.js`
- `frontend/js/ui/tables.js`

## Architecture summary

- The frontend remains a static HTML, CSS, and JavaScript application with one file per screen.
- All protected screens use the shared shell through `renderLayout(...)`.
- Route access is centralized through `requireRoutePage(...)` or `requireAuthPage(...)`.
- Most screens still use large inline scripts, direct `innerHTML`, inline handlers, and local DOM assumptions.
- Only `service-requests.html` currently consumes the Phase 1 shared UI primitives.

## Structural consistency findings

### Consistent patterns already shared

- Protected shell and navigation are centralized in `frontend/js/layout.js`.
- Session and permission access are centralized in `frontend/js/api.js`.
- Base button, panel, table, badge, modal, and empty-state CSS classes exist in `frontend/css/style.css`.
- The auth pages share the same visual shell and feedback-box pattern.

### Remaining screen-level duplication

- `dashboard.html` repeats toolbar, chart-panel, stat-card, filter, and error-state rendering.
- `technician.html` repeats modal toggling, table-body rendering, and empty-state handling.
- `assets.html` repeats modal logic, table rendering, detail/history panel rendering, destructive action styling, and lookup loading patterns.
- `maintenance.html` repeats modal logic, empty-state toggling, list rendering, and page-local layout CSS.
- `staff.html` repeats dual-modal logic, search/filter rendering, empty states, and admin action button groups.
- `departments.html` repeats modal toggling, detail modal rendering, and table body rendering.
- `knowledge-base.html` repeats page-local layout CSS, master-detail rendering, modal logic, and action controls.
- `reports.html` repeats chart setup, paginated table rendering, filter UI, and pagination controls.
- `audit-log.html` repeats filter handling, table body rendering, and empty-state toggling.
- `about.html` bypasses route-specific page guard patterns and renders static content directly.

## CSS consistency findings

- Embedded `<style>` blocks remain in `maintenance.html` and `knowledge-base.html`.
- Inline `style=` usage appears across nearly every remaining screen for modal sizing, spacing, colors, and layout alignment.
- Hard-coded error colors such as `#c0362c` and muted text colors such as `#667085` are still repeated inline instead of using only shared classes/tokens.
- One-off modal width values remain inline across assets, maintenance, staff, departments, technician, and knowledge-base screens.
- Page-local spacing values such as `margin-top:18px`, `margin-top:10px`, and `display:flex; gap:10px` are duplicated.
- The new `tokens.css` and `components.css` exist but are not yet used by the remaining screens directly beyond the base stylesheet import path.

## JavaScript structure findings

- Every remaining screen still uses an inline `<script>` block.
- Every remaining screen still renders content with direct `innerHTML`.
- Inline `onclick` handlers remain common in tables, modals, and action buttons.
- `alert()` remains the dominant API error handling pattern on operational screens.
- `prompt()` and `confirm()` remain in `assets.html` and `staff.html` for destructive or state-changing actions.
- Local debounce helpers are duplicated in `assets.html`, `staff.html`, and `audit-log.html`.
- Table-body rendering and empty-state toggling are reimplemented in each screen rather than using `UiTables`.
- Modal open/close behavior is repeated through direct `classList.add/remove('open')`.
- Permission checks remain inline in page templates through `hasPermission(...)`.

## Screen-specific audit notes

### `dashboard.html`

- Uses shared shell correctly.
- Does not use page-local CSS blocks, but still uses inline layout spacing and inline error styling.
- Uses permission-aware filters through `hasPermission('can_view_reports')`.
- Missing explicit loading and retry states for charts and summary cards.
- Highest compatibility risks are chart lifecycle assumptions and filter element IDs.

### `technician.html`

- Uses shared shell correctly.
- Still uses direct modal toggling and direct table rendering.
- Represents technician execution workflow clearly, but does not expose ticket creation even though technicians may create tickets according to the role brief.
- Missing explicit loading, success, disabled-submit, and validation states.
- Compatibility risks center on `update-modal`, `update-status`, `update-resolution`, and `activeId`.

### `assets.html`

- Uses shared shell correctly.
- Has the heaviest duplication outside service requests: two modals, table CRUD actions, lookup hydration, history/detail rendering, destructive flow, and prompts/confirms.
- Strong candidate for next implementation because it overlaps with nearly every shared primitive type.
- Missing structured loading, retry, read-only, and submission-in-progress states.
- Compatibility risks include modal IDs, history DOM structure, JSON-stringified inline edit handler payloads, and `prompt()`-driven return workflow assumptions.

### `maintenance.html`

- Uses shared shell correctly.
- Contains page-local CSS and two modal workflows.
- No clear permission gating on create or complete actions beyond route access, which may be acceptable if backend remains authoritative, but frontend role presentation is less explicit than the brief expects.
- Missing initial loading, read-only, disabled action, and success states.
- Compatibility risks include `m-form`, `schedule-form`, `schedule-list`, and status-completion flow assumptions.

### `staff.html`

- Uses shared shell correctly.
- Strong admin-only gating through `can_access_admin_portal`.
- Heavy duplication in modal workflows, form lifecycle logic, table rendering, invitation flow, and temporary-user prompts.
- Missing structured success feedback beyond prompt-based invitation sharing, and no explicit loading state while data sets load.
- Compatibility risks include many required element IDs and prompt/confirm side effects.

### `departments.html`

- Uses shared shell correctly.
- Lightweight screen with duplicated modal behavior and detail rendering.
- Lacks empty-state handling for the main table and has only minimal error display.
- Compatibility risks are moderate because the screen is simple but relies on specific modal/body IDs.

### `knowledge-base.html`

- Uses shared shell correctly.
- Contains page-local CSS, modal form workflow, master-detail layout, and feedback actions.
- Strong overlap with shared detail-panel and list-card primitives, but still uses custom CSS classes and inline layout spacing.
- Missing explicit initial loading, retry, submission-in-progress, and success states.
- Compatibility risks include URL hash synchronization, selected article state, and custom `kb-*` DOM IDs.

### `reports.html`

- Uses shared shell correctly.
- High duplication in chart creation, pagination controls, table rendering, and filter handling.
- Export buttons are permission-protected only by route-level access to the page, not by finer-grained button-level presentation.
- Missing explicit loading and retry states; failed export uses `alert()`.
- Compatibility risks include chart canvas IDs, pagination labels, and report paging state.

### `audit-log.html`

- Uses shared shell correctly.
- Simple screen with duplicated debounce, table rendering, and error handling.
- Missing explicit loading, retry, and not-found states.
- Compatibility risks are low to medium because behavior is simple but tied to specific IDs.

### `about.html`

- Uses `requireAuthPage()` rather than `requireRoutePage('about')`.
- Static content includes outdated system limitations and capability statements.
- No dynamic states required, but content accuracy is inconsistent with the current backend/frontend implementation.
- Compatibility risk is low, but documentation drift is high.

### `index.html`

- Uses the auth shell consistently.
- Implements minimal submission-in-progress feedback through button text.
- Missing password reset, retry affordance, and more structured invalid-state messaging.
- Compatibility risks are low and tied mainly to auth field IDs and session redirect assumptions.

### `register.html`

- Invitation acceptance flow is structurally consistent with the auth shell.
- Implements button-level submission-in-progress feedback.
- Missing invitation validation preflight, richer success guidance, and explicit expired-token state before submit.
- Compatibility risks are low and tied to token field handling and redirect assumptions.
