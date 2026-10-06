# Deal prototype

Read openspec/changes/marketplace-prototype before changing behavior. Keep domain independent of Next.js and Drizzle. Use test-first business rules and real PostgreSQL integration tests. Check authorization inside every server mutation; do not trust role or owner in form data. Never commit secrets. Use EUR, USD, GBP and PLN integer minor units (two decimals); convert with one dated FX snapshot before comparing amounts across currencies; use ISO country codes (GB, not UK). No real personal information in fixtures. Keep demo authentication explicitly opt-in. Run typecheck, tests, build and Playwright before delivery; report actual failures.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
