# Entity Relationship Diagram (ERD)

This diagram matches the actual PostgreSQL schema in `database/schema.sql` exactly —
it is not a separate conceptual diagram.

## Rendered Diagram

![NSC ICT Service Desk ERD](erd_diagram.png)

## Mermaid Source

The same diagram is also provided below as Mermaid source, in case you want to
regenerate it, embed it elsewhere, or view it interactively at
[mermaid.live](https://mermaid.live) or in VS Code with the "Markdown Preview
Mermaid Support" extension.

```mermaid
erDiagram
    DEPARTMENTS ||--o{ USERS : "has staff"
    DEPARTMENTS ||--o{ ASSETS : "owns"
    DEPARTMENTS ||--o{ SERVICE_REQUESTS : "originates"

    USERS ||--o{ ASSETS : "assigned to"
    USERS ||--o{ SERVICE_REQUESTS : "submits (requester)"
    USERS ||--o{ SERVICE_REQUESTS : "resolves (technician)"
    USERS ||--o{ MAINTENANCE : "performs (technician)"
    USERS ||--o{ AUDIT_LOGS : "performs action"

    ASSETS ||--o{ MAINTENANCE : "has history"

    DEPARTMENTS {
        int department_id PK
        string name
        text description
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        int user_id PK
        string full_name
        string email
        string username
        string password_hash
        string role
        int department_id FK
        string phone
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    ASSETS {
        int asset_id PK
        string asset_tag
        string asset_type
        string brand
        string model
        string serial_number
        int department_id FK
        int assigned_to FK
        date purchase_date
        string condition
        string status
        string location
        text description
        timestamp date_added
    }

    SERVICE_REQUESTS {
        int request_id PK
        int requester_id FK
        int department_id FK
        string category
        string subject
        text description
        string priority
        string status
        int assigned_technician_id FK
        text resolution
        timestamp date_submitted
        timestamp date_resolved
    }

    MAINTENANCE {
        int maintenance_id PK
        int asset_id FK
        int technician_id FK
        text problem
        text action_taken
        date maintenance_date
        numeric cost
        string status
        text notes
    }

    AUDIT_LOGS {
        int log_id PK
        int user_id FK
        string action
        string record_type
        int record_id
        text details
        timestamp created_at
    }
```

## Relationship summary (text form)

```
Departments 1 ──< Users
Departments 1 ──< Assets
Departments 1 ──< Service Requests

Users 1 ──< Assets            (assigned_to)
Users 1 ──< Service Requests  (requester_id)
Users 1 ──< Service Requests  (assigned_technician_id)
Users 1 ──< Maintenance       (technician_id)
Users 1 ──< Audit Logs        (user_id)

Assets 1 ──< Maintenance      (asset_id)
```

All foreign keys use `ON DELETE SET NULL` (for optional links, e.g. an asset whose
assigned staff member is removed) or `ON DELETE CASCADE` (for records that only make
sense attached to a parent, e.g. maintenance records belong to a specific asset).
See `database/schema.sql` for the exact constraint on each column.
