# Phase 9: Knowledge Base

## Scope

Phase 9 adds a reusable, searchable, and permission-aware knowledge base for recurring ICT issues.

Delivered areas:

- article CRUD and lifecycle workflow
- publish, draft, review, and archive statuses
- article visibility rules
- article search and suggestions
- article relations to ticket categories and asset types
- usefulness feedback tracking
- revision history
- frontend knowledge-base page
- ticket-creation and technician-side article suggestions
- report analytics

## Data model

Existing table reused:

- `knowledge_base_articles`

New tables:

- `knowledge_base_article_revisions`
- `knowledge_base_article_relations`
- `knowledge_base_article_feedback`

Article model additions:

- `category`
- `visibility_scope`
- `department_id`
- `current_revision_number`
- `last_reviewed_at`
- `search_keywords`
- `usefulness_score`
- `helpful_count`
- `not_helpful_count`
- `view_count`

## Visibility model

Supported scopes:

- `all_users`
- `department`
- `operational_only`

Rules:

- administrators and ICT officers can view and manage all articles
- staff can only view published `all_users` articles and their department-scoped published articles
- technicians can also view published `operational_only` articles
- unpublished articles are hidden from non-managers

## Suggestions

Suggestion matching uses:

- ticket subject
- ticket description
- ticket category
- ticket subcategory
- linked asset type
- article keywords and relation metadata

The ticket page now requests suggestion candidates while:

- creating a ticket
- reviewing a ticket detail record

## Revision history

Each create or update writes a revision row containing:

- revision number
- article content snapshot
- visibility and category snapshot
- change note
- editor identity

## Feedback

Authenticated users can mark an article:

- helpful
- not helpful

Feedback updates:

- `helpful_count`
- `not_helpful_count`
- `usefulness_score`

## Frontend

React knowledge-base page:

- [frontend/src/features/knowledge-base/pages/KnowledgeBasePage.jsx](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/knowledge-base/pages/KnowledgeBasePage.jsx)

Updated React integrations:

- [frontend/src/features/service-requests/components/KBSuggestions.jsx](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/service-requests/components/KBSuggestions.jsx)
- [frontend/src/features/reports/pages/ReportsPage.jsx](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/reports/pages/ReportsPage.jsx)
- [frontend/src/app/router.jsx](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/app/router.jsx)

## Reporting

Reports now include:

- article status counts
- total knowledge-base views
- helpful vs not-helpful feedback totals

## Verification

Phase 9 test coverage was added for:

- migration structure
- authorization behavior
- suggestion tokenization and scoring
