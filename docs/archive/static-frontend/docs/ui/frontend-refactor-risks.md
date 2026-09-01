# Frontend Refactor Risks

Date: 2026-08-30

## Cross-cutting risks

- Most screens rely on direct `innerHTML`, so extracting shared rendering helpers can break event wiring if IDs or inline handler names change.
- Many screens depend on exact DOM IDs as script contract points.
- Several screens mix modal markup and control logic tightly with page-local functions.
- Script order matters because pages assume `api.js` and `layout.js` globals already exist before inline page code runs.
- The current frontend stores auth state in `localStorage`; refactors must avoid changing auth/session behavior in UI-only phases.

## Required IDs and selectors by screen

### `dashboard.html`

- `date_from`
- `date_to`
- `department_id`
- `technician_id`
- `category`
- `ticket_type`
- `dashboard-summary`
- chart canvas IDs: `chart-ticket-status`, `chart-ticket-priority`, `chart-asset-status`, `chart-technician`

### `technician.html`

- `update-modal`
- `update-title`
- `update-status`
- `update-resolution`
- `open-rows`
- `done-rows`
- `open-empty`
- `done-empty`

### `assets.html`

- `asset-modal`
- `history-modal`
- `asset-form`
- `asset_id`
- `department_id`
- `assigned_to`
- `asset-rows`
- `history-body`
- `history-title`
- `modal-error`

Special risks:

- `editAsset(${JSON.stringify(asset)})` couples row markup to the raw asset object shape.
- Return workflow depends on `prompt()` values and exact status labels.

### `maintenance.html`

- `m-modal`
- `schedule-modal`
- `m-form`
- `schedule-form`
- `asset_id`
- `schedule_asset_id`
- `rows`
- `schedule-list`
- `empty`
- `schedule-empty`

### `staff.html`

- `s-modal`
- `i-modal`
- `s-form`
- `i-form`
- `rows`
- `invite-rows`
- `empty`
- `invite-empty`
- lifecycle field IDs for temporary-user logic

Special risks:

- Invitation flow depends on `window.prompt(...)` to display the one-time acceptance URL.
- Edit and invitation forms depend on toggling required fields based on `user_type`.

### `departments.html`

- `d-modal`
- `detail-modal`
- `d-form`
- `department_id`
- `rows`
- `detail-body`
- `detail-title`

### `knowledge-base.html`

- `article-modal`
- `article-form`
- `kb-list`
- `kb-empty`
- `kb-detail`
- all `kb-*` filter fields
- `article_*` form fields

Special risks:

- Uses `window.location.hash` as part of selection and deep-link behavior.

### `reports.html`

- `date_from`
- `date_to`
- `department_id`
- `technician_id`
- `category`
- `ticket_type`
- page labels: `tickets-page-label`, `assets-page-label`, `maintenance-page-label`
- row targets: `ticket-rows`, `asset-rows`, `maintenance-rows`
- chart canvas IDs: `chart-status`, `chart-type`, `chart-priority`, `chart-req-status`, `chart-sla`, `chart-maint-health`

Special risks:

- Pagination behavior depends on `pageState`.
- Chart instances must be destroyed before rerender.

### `audit-log.html`

- `filter-action`
- `rows`
- `empty`

### `index.html`

- `login-form`
- `identifier`
- `password`
- `login-btn`
- `error-box`

### `register.html`

- `accept-form`
- `token`
- `username`
- `phone`
- `password`
- `accept-btn`
- `error-box`

## Migration sequencing risks

- `assets.html`, `staff.html`, `maintenance.html`, `knowledge-base.html`, and `reports.html` carry the most duplication and behavioral coupling.
- `departments.html`, `audit-log.html`, `index.html`, and `register.html` are safer later cleanups or lower-risk follow-ups.
- `about.html` should be treated as a content-alignment pass rather than a structural component-migration priority.

## Recommended extraction safeguards

- Preserve route-level guards exactly.
- Preserve element IDs and inline-handler entry points during transitional refactors.
- Replace modal logic before replacing modal markup.
- Replace table-body rendering before replacing filter structures.
- Do not refactor chart-heavy pages and CRUD-heavy pages in the same execution unless there is a dedicated browser verification step.
