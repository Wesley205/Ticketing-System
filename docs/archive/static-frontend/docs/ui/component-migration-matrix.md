# Component Migration Matrix

Date: 2026-08-30

## Reusable pattern inventory

### Pattern: Buttons and action groups
Reference implementation:
`frontend/service-requests.html` uses shared `.btn`, `.btn.secondary`, `.link-btn`, and inline action groups with predictable spacing.
Other locations:
`dashboard.html`, `technician.html`, `assets.html`, `maintenance.html`, `staff.html`, `departments.html`, `knowledge-base.html`, `reports.html`, `audit-log.html`, `index.html`, `register.html`
Current variations:
Inline flex wrappers, one-off inline colors for destructive actions, page-specific button group markup, mixed modal footer actions.
Recommended shared interface:
Shared button-group container and optional destructive modifier, leaving existing `.btn` classes intact.
Risk if extracted:
Medium because many pages rely on inline handlers and exact button ordering.

### Pattern: Tables and table actions
Reference implementation:
`service-requests.html` uses shared table classes with extracted row rendering and empty-state toggling.
Other locations:
`technician.html`, `assets.html`, `maintenance.html`, `staff.html`, `departments.html`, `reports.html`, `audit-log.html`
Current variations:
Separate body IDs, custom action columns, mixed external empty blocks versus inline empty rows.
Recommended shared interface:
`UiTables.renderBody(bodyId, emptyId, rowsHtml, emptyMessage)` plus an optional paginated-table helper later.
Risk if extracted:
Medium because reports mixes external labels and paginated footer logic.

### Pattern: Filters and search inputs
Reference implementation:
`service-requests.html` has grouped filter selects and checkbox filters inside `.toolbar` and `.filters`.
Other locations:
`dashboard.html`, `assets.html`, `maintenance.html`, `staff.html`, `reports.html`, `audit-log.html`, `knowledge-base.html`
Current variations:
Date filters, text inputs, select combinations, optional permission-gated filters.
Recommended shared interface:
Shared toolbar/filter markup conventions and a small filter-state helper, without changing API parameter names.
Risk if extracted:
Low to medium because filter IDs are contract points with page scripts.

### Pattern: Modals
Reference implementation:
`service-requests.html` now uses `UiModals.open/close(...)` while retaining modal IDs and existing markup.
Other locations:
`technician.html`, `assets.html`, `maintenance.html`, `staff.html`, `departments.html`, `knowledge-base.html`, notification preferences in `layout.js`
Current variations:
Direct `classList.remove('open')`, modal-specific widths, multi-modal pages, prompt/confirm fallbacks.
Recommended shared interface:
`UiModals.open(id)` and `UiModals.close(id)` plus optional width utility classes later.
Risk if extracted:
Low for simple open/close, medium for keyboard and focus handling.

### Pattern: Form grids and modal forms
Reference implementation:
`service-requests.html` uses `.form-stack`, `.field`, and consistent modal actions.
Other locations:
`assets.html`, `maintenance.html`, `staff.html`, `departments.html`, `knowledge-base.html`, `register.html`, `index.html`
Current variations:
Some use `.form-grid`, some stack fields, some mix required lifecycle logic inline.
Recommended shared interface:
Keep CSS classes shared; later extract form-state utilities, not form behavior.
Risk if extracted:
Medium because form IDs and validation assumptions are page-specific.

### Pattern: Error boxes and feedback
Reference implementation:
`service-requests.html` uses `UiFeedback.clearBox/setBox` for the create-ticket modal.
Other locations:
`index.html`, `register.html`, `assets.html`, `maintenance.html`, `staff.html`, `departments.html`, `knowledge-base.html`
Current variations:
Some use error boxes, others use `alert()`, others write inline error paragraphs.
Recommended shared interface:
`UiFeedback.clearBox(id)` and `UiFeedback.setBox(id, message)` plus later success-box helper.
Risk if extracted:
Low.

### Pattern: Empty, loading, and error states
Reference implementation:
`service-requests.html` has improved empty/detail-empty handling and shared page-state support is available through `api.js` and `UiStates`.
Other locations:
All remaining screens
Current variations:
Mostly empty states only, with loading as raw text and errors as alerts or inline paragraphs.
Recommended shared interface:
`UiStates.loading`, `UiStates.empty`, and `UiStates.error`.
Risk if extracted:
Low to medium because some screens render into partial containers, not full sections.

### Pattern: Status and priority badges
Reference implementation:
`service-requests.html` uses `UiBadges.renderStatus`, `UiBadges.renderPriority`, and `UiBadges.renderBadge`.
Other locations:
`technician.html`, `assets.html`, `maintenance.html`, `staff.html`, `reports.html`
Current variations:
Inline `<span class="badge ...">` markup, custom inactive mapping in staff, raw text in reports detail rows.
Recommended shared interface:
`UiBadges.renderStatus(value)` and `UiBadges.renderPriority(value)`.
Risk if extracted:
Low.

### Pattern: Pagination
Reference implementation:
No shared pagination primitive yet; service requests currently does not paginate in the UI.
Other locations:
`reports.html`
Current variations:
Manual previous/next controls and page labels with shared page state object.
Recommended shared interface:
A dedicated pagination primitive after reports behavior is stabilized.
Risk if extracted:
Medium because page state and endpoint parameters are tightly coupled.

### Pattern: Detail views
Reference implementation:
`service-requests.html` uses the shared detail-grid and stacked section conventions from `components.css`.
Other locations:
`knowledge-base.html`, `assets.html` history modal, `departments.html` detail modal
Current variations:
Master-detail split, modal detail bodies, list-card sections, mixed inline styles.
Recommended shared interface:
Shared detail blocks, meta grids, timeline lists, and section title conventions.
Risk if extracted:
Medium because each page has different selection and navigation assumptions.

## Screen migration matrix

| Screen | Shared primitives used | Duplicated patterns | Missing states | Role concerns | Accessibility concerns | Compatibility risks | Priority |
| ------ | ---------------------- | ------------------- | -------------- | ------------- | ---------------------- | ------------------- | -------- |
| `dashboard.html` | `style.css`, `api.js`, `layout.js` | filters, chart panels, summary cards, inline error block | loading, retry, empty chart datasets, disabled filter actions | report filters hidden by permission, otherwise aligned | charts lack surrounding loading/error semantics | chart IDs, filter IDs, chart lifecycle | Medium |
| `technician.html` | `style.css`, `api.js`, `layout.js` | modal control, table rendering, status badges | loading, success, validation error, disabled submit | technicians may create tickets per brief, UI does not surface it | modal lacks dialog semantics; inline close handlers | `update-modal`, `activeId`, row action handlers | High |
| `assets.html` | `style.css`, `api.js`, `layout.js` | dual modals, table CRUD, history detail view, prompts/confirms, badges | loading, retry, read-only, submit-in-progress, success | asset actions are permission-gated, generally aligned | prompt/confirm flows, inline destructive color, modal semantics | modal IDs, history body structure, JSON inline edit payloads | High |
| `maintenance.html` | `style.css`, `api.js`, `layout.js` | page-local CSS, dual modals, list rendering, empty states | loading, read-only, success, retry, disabled actions | create/complete actions are not explicitly role-presented beyond route access | modal semantics, page-local responsive CSS | `m-form`, `schedule-form`, record/schedule IDs | High |
| `staff.html` | `style.css`, `api.js`, `layout.js` | dual modals, table rendering, prompts/confirms, empty states | loading, success confirmation, disabled submit, retry | admin actions are explicit; role/user_type distinction preserved in forms | prompt flows, modal semantics, inline action cluster | many IDs, invitation URL prompt, lifecycle toggles | High |
| `departments.html` | `style.css`, `api.js`, `layout.js` | modal control, detail modal rendering | empty table state, loading state, retry state | admin-only create/edit is explicit | detail modal semantics, inline close handlers | `d-modal`, `detail-modal`, body IDs | Medium |
| `knowledge-base.html` | `style.css`, `api.js`, `layout.js` | page-local CSS, modal workflow, master-detail cards | loading, retry, success feedback, disabled submit | management action gating is explicit | clickable card divs are not semantic buttons; modal semantics | hash routing, `kb-*` IDs, selected article state | High |
| `reports.html` | `style.css`, `api.js`, `layout.js` | filter bar, chart setup, paginated tables, export actions | loading, retry, disabled pagination, empty summary blocks | export controls rely on route access, not explicit per-control presentation | chart semantics, pagination buttons without disabled states | page labels, pageState object, chart IDs | High |
| `audit-log.html` | `style.css`, `api.js`, `layout.js` | debounce, table rendering, empty-state toggling | loading, retry, not-found distinction | route gating aligns | minimal filter accessibility and no loading announcements | rows/body IDs and simple filter contract | Medium |
| `about.html` | `style.css`, `api.js`, `layout.js` | static panel only | not applicable | content accuracy drift, not a permission bug | mostly readable; static content only | low technical risk, high content drift | Low |
| `index.html` | `style.css`, `api.js` | auth form submission and error-box handling | password reset state, retry guidance | no role issue visible pre-login | missing explicit error summary association | auth field IDs and redirect flow | Low |
| `register.html` | `style.css`, `api.js` | auth form submission and error-box handling | expired token preflight, success guidance, retry path | invitation-only role flow preserved | inline link display style, no pre-submit token status | token field/query param handling | Low |
