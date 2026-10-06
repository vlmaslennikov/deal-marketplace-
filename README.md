# Deal Marketplace Prototype

A small full-stack M&A marketplace: profile → discovery → explainable matching → private introduction → moderation.

**Next.js + TypeScript + PostgreSQL + Drizzle + Better Auth.** All business data is stored server-side. No localStorage database. Synthetic demo data only.

## Run locally

Requires Node.js 22+ and Docker Compose (or an existing PostgreSQL 17+ database).

```bash
npm ci
cp .env.example .env
# Set BETTER_AUTH_SECRET to a random secret (at least 32 characters).
# Keep DATABASE_URL from .env.example when using this Compose database.
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

For an existing database, keep its current `DATABASE_URL` and run `npm run db:migrate` before starting the updated app. The new sample Compose credentials apply to a fresh volume; the migration updates existing demo login addresses.

Open http://localhost:3000. Use the Buyer, Seller or Manager demo buttons. They create real Better Auth credential sessions. With the example password, manual sign-in uses:

| Role    | Email                  | Password              |
| ------- | ---------------------- | --------------------- |
| Buyer   | buyer@dealdemo.local   | demo-marketplace-2026 |
| Seller  | seller@dealdemo.local  | demo-marketplace-2026 |
| Manager | manager@dealdemo.local | demo-marketplace-2026 |

`DEMO_PASSWORD` must be the same at seed and runtime. Existing credentials are not overwritten by reseeding. Demo login is enabled only with `DEMO_MODE=true`; these intentionally shared accounts are for evaluation. Sign-up is disabled. A public demo manager can suspend the other demo accounts; reactivate them using the manager account.

### Evaluate the product

1. **Buyer:** edit My profile, select acquisition interests, browse/filter/sort assets, inspect the fit explanation, contact a seller, reload Messages.
2. **Seller:** create a draft, publish a complete listing, edit it, search buyers, use Find matching buyers and send an introduction.
3. **Manager:** search participants/assets, select a participant role/status, suspend with a reason, verify listings disappear, reactivate. Removal is terminal; audit and conversation history remain.
4. Resize to a mobile viewport. Filters live in the URL; Back/Forward and refresh retain search state.

## Scope and decisions

- **DDD-lite / hexagonal:** pure domain policies; an application service consumes the `MarketplaceStore` transaction port; a Drizzle adapter implements it. Next route handlers authenticate, validate transport and map errors. Read queries are separated from write use cases without a CQRS framework. Files are grouped by feature; messaging and moderation remain in one cohesive prototype module to keep the scope small.
- **One marketplace, many users:** roles are not tenants. No tenant_id or organization model. PostgreSQL handles sessions, profiles, assets, messages and moderation. Redis is unnecessary at this scale.
- **Money:** EUR, USD, GBP and PLN amounts use integer minor units (two decimals), capped at 20m in their stored currency. Discovery and matching use one dated Frankfurter exchange-rate snapshot; original amounts remain stored and visible. A missing rate disables cross-currency comparisons and selected-currency filters. The server needs outbound HTTPS to `api.frankfurter.dev`; rates are cached for six hours and a recent cached rate can cover an outage.
- **Contact:** one persisted conversation per buyer/seller pair, optional initial asset context. Server checks membership on reads and active status on writes. Unique pair and request nonce prevent duplicates. Conversation creation and first message are atomic.
- **Moderation:** ACTIVE → SUSPENDED → ACTIVE, or removal from either active/suspended. REMOVED is terminal. Participant row locks serialize writes against moderation. Managers cannot moderate themselves/other managers or read private conversations.
- **Discovery:** only published assets from active sellers; own drafts and all assets for managers. URL query validation, server-side database filtering, deterministic ordering and 12-item pagination. Matching and final slicing are in memory after the filtered SQL query; deliberate small-catalog trade-off, not high-load architecture.
- **Matching:** budget 30, category 25, jurisdiction 20, licence 15, normalized over configured criteria. Missing criteria do not penalize the result; entirely empty criteria produce no score. Explainable rules, **not an LLM, probability, verification or investment recommendation**.
- **Privacy:** public participant projections omit email and auth fields. No invented verified badges. Licence labels/companies are synthetic and illustrative.
- **UX:** structured cards, clear pricing/licences, empty/error/loading states, accessible labels, mobile layout, moderation reason and confirmation, manual inbox refresh. No realtime claims.

## AI-first workflow

OpenAI Codex was used to review the brief, inspect the original marketplace catalog, write OpenSpec artifacts, draft code and fixtures, run tests, diagnose environment problems and perform a separate code review. Human-readable contracts and observable tests constrained the generated output. The review found two real query defects (buyer-profile authorization and matching-buyer search); both received failing regression tests before fixes. No private data from the reference marketplace was collected.

Domain and application guard tests followed RED → GREEN. Integration and end-to-end scenarios were added as behavior contracts; do not interpret this as strict per-line TDD of every component. An optional OpenRouter/LLM enhancement was deliberately deferred; no API key is required and the UI does not label deterministic matching as AI.

Specs: `openspec/changes/marketplace-prototype/`. Design and execution plan are included. CLI OpenSpec validation could not run because the environment's automatic review blocked potential external data transmission; local structural validation is provided as `npm run specs:check` and is explicitly not a replacement for official CLI validation.

## Verification

```bash
npm run typecheck
npm run format:check
npm test                  # domain/application; DB suite explicitly skipped
npm run test:integration  # all unit + integration tests, using DATABASE_URL
npm run build
npm start                # leave running in a separate terminal
npx playwright install chromium
npm run test:e2e
npm run specs:check
```

Integration tests and browser tests write data: use a **dedicated demo/test database**. Integration fixtures have the `it-` prefix and are cleaned after the suite. E2E uses the seeded demo accounts and leaves demo messages/listings behind. The manager test restores the suspended seller on success. Repeated seeds are additive and do not reset edits.

To use a supplied Chromium bundle:

```bash
CHROMIUM_PATH=/absolute/path/to/chrome-headless-shell npm run test:e2e
```

The Playwright build and supplied browser may differ; use Playwright's own installed Chromium for repeatable CI.

See `docs/verification.md` for actual executed checks and limitations. CI in `.github/workflows/ci.yml` uses a PostgreSQL 17 service; it is included but has not been executed remotely.

### Verify against a Neon test database

Use a dedicated test database: this command applies migrations, adds synthetic demo data, runs integration tests and starts the app for Playwright. It leaves demo listings and messages in that database. The connection string is read from `DATABASE_URL` and is never stored in the repository.

```bash
npm ci
npx playwright install chromium
read -r -s -p 'Neon DATABASE_URL: ' DATABASE_URL; echo
export DATABASE_URL
# Configure BETTER_AUTH_SECRET and DEMO_PASSWORD in your ignored .env file.
# Set BETTER_AUTH_URL=http://localhost:3000 and DEMO_MODE=true there.
npm run qa:neon
unset DATABASE_URL
```

The local execution environment blocks DNS for Neon, so the included remote test script could not be executed here. The suite was last run against PGlite TCP; its native PostgreSQL behavior remains to be verified on Neon.

### Restricted-environment preview

The development-only `npm run db:preview` starts **PGlite**, a WASM PostgreSQL build, over TCP. For this preview use `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres`, then migrate and seed normally. Data persists in `.pgdata/`. This is an explicit preview alternative, **not the production DB and not evidence of native PostgreSQL concurrency behavior**. Native PostgreSQL could not be started in the execution sandbox because only root UID was mapped. The application still uses the same `pg`/Drizzle SQL adapter. `scripts/qa-sandbox.sh` runs preview DB, app and tests in one network namespace after a production build.

## Deployment

**No public deployment has been made.** This workspace has no GitHub remote, linked Vercel project or Vercel access token. The workflow is ready to run after those are configured.

### GitHub Actions → Vercel production

1. Push the repository to GitHub with `main` as its production branch. Create or link a Vercel **Next.js** project. From the Vercel CLI `vercel link`, use the `orgId` and `projectId` in `.vercel/project.json` as the corresponding GitHub secrets. The committed `vercel.json` disables Vercel's independent Git auto-deployments, so Actions controls releases.
2. In GitHub, create the `production` environment. Add secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DATABASE_URL` and `DEMO_PASSWORD` there. The `DATABASE_URL` secret is used by the deployment job to migrate and seed the **production** database. Use a separate database from the one used for CI and any temporary testing. The CI job itself uses an ephemeral PostgreSQL 17 service and has no access to production secrets.
3. In **Vercel Production** environment variables, set the same `DATABASE_URL` and `DEMO_PASSWORD`, plus `BETTER_AUTH_SECRET` (a random 32+ character secret), `BETTER_AUTH_URL=https://<your-production-domain>` and `DEMO_MODE=true`. Use the final production origin for `BETTER_AUTH_URL`. Never put auth or database secrets in `NEXT_PUBLIC_` variables.
4. Push to `main` or manually dispatch `verify-and-deploy` on `main`. Pull requests and other branches run tests only. A production push runs formatting, types, specs, PostgreSQL integration tests, build and Playwright; on success it applies migrations, runs the idempotent demo seed, builds with Vercel CLI, deploys and checks `/login`. The production job runs one at a time.

The demo manager can suspend demo accounts; restrict access to evaluators while demo mode is enabled. The workflow has not run remotely because this workspace is not connected to a GitHub repository or Vercel account.

For a Node container:

```bash
docker build -t deal-prototype .
docker run --rm --env-file .env -p 3000:3000 deal-prototype
```

Set `DATABASE_URL` to a database reachable **from the container** (not the container's localhost), and `BETTER_AUTH_URL` to its public origin. Apply migrations/seed before serving; application startup does not mutate the schema. The Dockerfile is provided but Docker execution was unavailable here.

## With more time

Native PostgreSQL concurrency CI and deployed smoke test first; then SQL-side matching/pagination, inbox joins to remove small-catalog N+1 queries, private isolated evaluator demos, rate limiting on marketplace writes, profile version checks, stronger accessibility testing/focus management, more cross-browser checks, opt-in LLM explanations. No payments, KYC, NDA, file room, organization workspaces or deal pipeline in this prototype.
