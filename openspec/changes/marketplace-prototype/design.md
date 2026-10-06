# Design and review of previous proposal

## Intent and scope

Evaluator can enter as one of three demo roles, complete marketplace flows and refresh without loss. English UI. Prototype uses synthetic data; demo mode deliberately permits evaluator role switching, including manager. One role per user; no signup is needed for the assignment. Buyer profile creation/update is supported by upsert.

## Decisions

- Real Next.js App Router/TypeScript, not a framework compatibility substitute. PostgreSQL + Drizzle; Better Auth credential sessions. Domain is pure TypeScript; application services consume a repository transaction port; infrastructure implements it. Thin HTTP adapter and client presentation components.
- Shared marketplace with multi-user authorization, no tenant_id. Organizations alone would not automatically imply tenants; a future tenant boundary requires an isolation product requirement.
- EUR, USD, GBP and PLN use integer minor units bounded to safe DB integer range. Frankfurter public daily exchange rates provide one dated snapshot for display, filtering, sorting and matching. Persist original amount and currency; never silently relabel on form currency change. If rates are unavailable, show original amounts and suppress cross-currency ranking/filtering. Regulatory fixture labels are illustrative, not legal assertions.
- No verified badges without a verification workflow. Rules-based score is an explainable ranking index, never a probability or claimed machine learning. Missing criteria are excluded from the denominator; entirely empty criteria give no score.
- Suspended/removed users disappear from public directories and cannot mutate data. Their listings remain stored and are excluded dynamically. Reactivation restores visibility only for published assets. Removed is terminal. Manager cannot moderate managers or themselves.
- Cookie sessions never authorize from a cached role alone: database actor is checked on each API request and transaction. Serialize relevant participant row locks for mutation/moderation races. Role is never editable through profile data.
- One conversation per buyer/seller pair; first asset provides context. Unique pair prevents concurrent duplicates. First message and conversation are committed atomically; nonce uniqueness makes retries idempotent. Participants only can read messages. Suspended participant's counterpart may read history but cannot send; manager cannot read private messages.
- Public projections omit emails/session tokens. Authenticated catalog, so unknown users first see login. Draft assets visible only to owner and manager.
- Draft requires syntactically valid fields but can have blank title/description and zero price; publishing requires title >=8 chars, description >=40 chars, positive price, licence and regulator. Editing published listings must meet publish requirements. Published may be archived; archived is read-only in this prototype.

## UX

Steel–indigo navigation, steel–malachite action gradients, crisp white catalog, structured country/licence details. Compact discovery header and visible filters before cards. URL filters and sorting; explainable matching in details. Responsive sidebar becomes stacked nav. Loading, errors, empty search and form validation. Explicit confirmation and reason for moderation. In-app inbox (manual refresh), no WebSocket claim.

## Persistence

user/session/account/verification (Better Auth); profiles (one per buyer/seller); assets; conversations; messages; moderationActions. FKs, unique email/pair/nonce, enum status, nonnegative cents constraints; role and ownership enforced transactionally in application layer. Migration and seed are explicit scripts, never automatic on startup. Seed inserts deterministic fixture IDs with faker seeded; non-destructive on conflict. DATABASE_URL required; no silent memory fallback.

## Delivery and operations

Docker Compose PostgreSQL for users; embedded PostgreSQL binary only for development/testing where Docker is unavailable. Node-compatible Dockerfile and environment example. Vercel deployment instructions; deploy only with an actual configured account/DB. No fabricated deployment URL. Tests on real PG plus provided Chromium. Optional LLM explanations deferred until core delivery; no fake AI branding.
