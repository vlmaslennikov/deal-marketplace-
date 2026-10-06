# Architecture and user flows

```mermaid
flowchart TD
  UI["Next.js role workspaces"] --> HTTP["Session + HTTP validation"]
  HTTP --> APP["Application use cases"]
  APP --> DOMAIN["Pure domain policies"]
  APP --> PORT["Transaction port"]
  PORT --> ADAPTER["Drizzle adapter"]
  ADAPTER --> DB[("PostgreSQL")]
  HTTP --> QUERY["Authorized read queries"]
  QUERY --> DB
```

```mermaid
erDiagram
  USERS ||--o| PROFILES : has
  USERS ||--o{ ASSETS : owns
  USERS ||--o{ SESSIONS : authenticates
  USERS ||--o{ ACCOUNTS : credentials
  USERS ||--o{ CONVERSATIONS : participates
  CONVERSATIONS ||--o{ MESSAGES : contains
  ASSETS o|--o{ CONVERSATIONS : context
  USERS ||--o{ MODERATION_ACTIONS : subject
```

```mermaid
flowchart TD
  LOGIN["Choose demo role"] --> BUYER["Buyer profile and interests"]
  LOGIN --> SELLER["Seller listing editor"]
  LOGIN --> MANAGER["Participant review"]
  BUYER --> DISCOVER["Filter assets and inspect fit"]
  SELLER --> PUBLISH["Validate and publish"]
  SELLER --> DIRECTORY["Filter buyers"]
  DISCOVER --> CONTACT["Private introduction"]
  DIRECTORY --> CONTACT
  CONTACT --> INBOX["Persisted conversation"]
  MANAGER --> SUSPEND["Suspend / remove with reason"]
  SUSPEND --> HIDE["Hide profile and listings; block writes"]
  MANAGER --> RESTORE["Reactivate suspended participant"]
```

## Invariants

- Role and identity come from the authenticated DB user, never submitted form fields.
- Transaction locks cover both participants for contact and actor/target for moderation in sorted ID order.
- Removal preserves foreign keys and audit history; reactivation of removed users is forbidden.
- Visibility is computed from asset and owner status, so suspension does not destructively rewrite listing state.
- EUR, USD, GBP and PLN minor units are validated on input and constrained in SQL. A cached dated Frankfurter rate snapshot converts amounts in discovery and matching; stored amounts remain native.
- Conversation pair and sender/nonce uniqueness are enforced by PostgreSQL.
- Reads expose explicit projections, not auth records. Manager oversight does not grant inbox access.
