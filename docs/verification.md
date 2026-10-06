# Verification record

## Executed checks

| Check                                                | Result                                                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| TypeScript strict typecheck                          | PASS                                                                                                           |
| Prettier formatting check                            | PASS                                                                                                           |
| Next.js production build                             | PASS                                                                                                           |
| Domain + application tests                           | 35 PASS                                                                                                        |
| Database integration tests                           | 13 PASS using pg/Drizzle against PGlite TCP                                                                    |
| Playwright, supplied Chromium headless 153.0.8010.12 | 7 PASS                                                                                                         |
| Local spec structural check                          | 6 capabilities PASS                                                                                            |
| Official OpenSpec CLI validation                     | NOT RUN: automatic approval review rejected potential transmission of project/spec data to an external service |
| Native PostgreSQL execution/concurrency              | NOT VERIFIED in this environment                                                                               |
| Docker build/run and hosted CI                       | NOT RUN; Docker/account unavailable                                                                            |
| Public deployment                                    | NOT DONE; hosting access and managed PostgreSQL URL required                                                   |

Playwright ran against the production standalone server, not static mocks. Desktop viewport: 1440×1000; mobile: 390×844. `docs/desktop-catalog.png` and `docs/mobile-catalog.png` are actual browser captures. Browser console was not the primary correctness oracle: the suite verifies visible outcomes and persisted records.

## Covered behavior

- Buyer URL filters → asset details → fit explanation → contact → reload-preserved message.
- Seller creates/publishes → reload-preserved listing → buyer search/profile → contact.
- Buyer edits profile, refresh retains changes.
- Manager suspends/reactivates through a reason/confirmation dialog.
- Mobile document has no horizontal overflow; screenshots visually inspected.
- Anonymous API requests return 401.
- Seller switches populated EUR amount to USD through the rate endpoint (intercepted with a deterministic API response), publishes and refreshes the stored USD amount; SVG flag is visible.
- Cross-currency filter, sort and budget match run against one injected dated rate snapshot in integration tests.
- Domain authorization, money parsing, publish rules, empty/partial matching criteria, terminal removal.
- DB ownership, draft privacy, ignored role injection, contact retry idempotency, private conversation membership, suspended writes/visibility and restoration, malformed URL criteria.

## Review findings resolved

1. A buyer could obtain another buyer profile through `person` on a non-directory view. Added regression test, observed RED, enforced role checks for that projection, observed GREEN.
2. Buyer search in seller matching mode accidentally applied the buyer query to the context asset. Added regression test, observed RED, separated context loading from buyer filters, observed GREEN.

## Environment details and remaining work

The server fetches daily Frankfurter rates, caches them for six hours and accepts a cached snapshot up to seven days old during an outage. This execution environment could not reach that public API, so live rates were not verified here; tests use deterministic responses. A deployed instance needs outbound HTTPS access to `api.frankfurter.dev`. Without rates, the UI shows native amounts and disallows converted filters.

A Neon PostgreSQL test endpoint was supplied on 2026-10-06. DNS lookup for that endpoint returned `EAI_AGAIN` both in the default sandbox and with escalated local execution, before any credential was sent. The native PostgreSQL suite therefore remains unverified. The `npm run qa:neon` script is ready for a host with Neon access and reads the connection string only from the environment.

The environment mapped only root UID, so native PostgreSQL could not run under its required non-root account. PGlite is a PostgreSQL WASM build and the same SQL migrations and pg/Drizzle application adapter were used, but its multiplexing is not native PostgreSQL concurrency. The included GitHub Actions workflow uses PostgreSQL 17 and now gates a Vercel production deployment behind that test job. No remote CI or deployment run is claimed; GitHub and Vercel are not connected in this workspace.

The supplied archive initially passed gzip validation. Extracted executables were later truncated during workspace restoration; byte lengths were compared to tar metadata. The headless executable was recovered from the intact early archive member (197,422,408 bytes). Browser tests then completed successfully. No Chromium binaries are included in the source deliverable.

The official OpenSpec command was blocked by automatic review because its external transmission payload was not established. It was not retried or disguised; the replacement is an explicitly local structural checker, not official CLI validation.

No LLM feature, fake verification badge or deployed URL is claimed. Matching is deterministic. Missing hosting/database access is the final delivery dependency.
