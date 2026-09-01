# UI State Coverage

Date: 2026-08-30

Legend:

- Present
- Partial
- Missing
- N/A

| Screen | Initial loading | Refreshing | Empty results | No selected record | Not found | API error | Validation error | Permission-restricted action | Read-only mode | Submission in progress | Successful submission | Failed submission | Retry behavior | Disabled action state |
| ------ | --------------- | ---------- | ------------- | ------------------ | --------- | --------- | ---------------- | ---------------------------- | -------------- | ---------------------- | -------------------- | ----------------- | -------------- | --------------------- |
| `dashboard.html` | Missing | Partial | Partial | N/A | Missing | Partial | N/A | Present | Partial | N/A | N/A | Partial | Missing | Missing |
| `technician.html` | Missing | Missing | Present | N/A | Missing | Partial | Missing | Partial | Partial | Missing | Missing | Partial | Missing | Missing |
| `assets.html` | Missing | Missing | Present | N/A | Missing | Partial | Present | Present | Partial | Missing | Missing | Present | Missing | Missing |
| `maintenance.html` | Missing | Missing | Present | N/A | Missing | Partial | Present | Partial | Partial | Missing | Missing | Present | Missing | Missing |
| `staff.html` | Missing | Partial | Present | N/A | Missing | Partial | Present | Present | Partial | Missing | Partial | Present | Missing | Missing |
| `departments.html` | Missing | Missing | Missing | N/A | Missing | Partial | Present | Present | Partial | Missing | Missing | Present | Missing | Missing |
| `knowledge-base.html` | Missing | Missing | Present | Present | Missing | Partial | Present | Present | Partial | Missing | Missing | Present | Missing | Missing |
| `reports.html` | Missing | Missing | Partial | N/A | Missing | Partial | N/A | Partial | Partial | Missing | N/A | Partial | Missing | Missing |
| `audit-log.html` | Missing | Missing | Present | N/A | Missing | Partial | N/A | Present | Partial | N/A | N/A | Partial | Missing | Missing |
| `about.html` | N/A | N/A | N/A | N/A | N/A | Missing | N/A | N/A | N/A | N/A | N/A | Missing | N/A | N/A |
| `index.html` | Partial | N/A | N/A | N/A | N/A | Present | Partial | N/A | N/A | Present | Partial | Present | Missing | Partial |
| `register.html` | Partial | N/A | N/A | N/A | Partial | Present | Partial | N/A | N/A | Present | Partial | Present | Missing | Partial |

## Notes

- "Partial" for API error usually means the screen uses `alert()` or a raw inline paragraph instead of a structured reusable error state.
- "Partial" for submission in progress on auth screens means the submit button text changes, but no broader form lock or progress state exists.
- "Permission-restricted action" is marked "Partial" where route access exists but button-level presentation does not fully reflect the role brief.
- The most common missing state classes are initial loading, retry, disabled action state, and explicit success confirmation.
