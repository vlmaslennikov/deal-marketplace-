# Implementation decisions and review ledger

- Kept the user's Next.js/PostgreSQL stack. The available built-in host used a different runtime; no framework or database substitution was made for production. Cost: hosted delivery remains pending access to a compatible platform and database.
- Grouped related prototype use cases in one marketplace module with clear domain/application/infrastructure layers instead of five separate packages. Cost: split bounded modules if the product expands.
- Constrained amounts to EUR cents and €20m maximum. Cost: larger deals or multi-currency discovery require an explicit model extension.
- Implemented transparent rules-based matching; deferred optional OpenRouter explanations. Cost: no claim to the optional LLM product bonus.
- Used PGlite only for sandbox testing/preview. Cost: native PostgreSQL behavior and concurrent transactions still require CI verification.
- Official OpenSpec CLI validation blocked by automatic approval review; local structural check only. Cost: run the approved official validator before archiving the change.
- Final review: independent read-only review identified two important query issues; both were reproduced and fixed with RED→GREEN integration tests. The reviewer was not represented as a comprehensive security audit.
- Deferred minor: inbox uses simple per-thread lookup queries; acceptable for this seeded prototype, replace with joins for scale.
- Deferred minor: moderation dialog has accessible labeling but needs a full keyboard focus-trap/return-focus audit.

- Currency extension (2026-10-06): EUR, USD, GBP and PLN retain native integer minor units; public Frankfurter daily rates drive indicative conversions and cross-currency discovery, with original amounts kept. This supersedes the initial EUR-only prototype choice above.
