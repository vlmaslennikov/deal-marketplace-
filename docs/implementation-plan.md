# Deal Implementation Plan

> For agentic workers: use superpowers:executing-plans inline. User already asked to proceed with the supplied project plan.
> **Goal:** working three-role marketplace with persisted data.
> **Architecture:** Pure domain policies, application transaction port, Drizzle PostgreSQL adapter, thin Next API and responsive UI.
> **Tech stack:** Next.js, React, TypeScript, Drizzle, PostgreSQL, Better Auth, Zod, Faker, Vitest, Playwright.
> **Spec:** openspec/changes/marketplace-prototype/design.md

## Global constraints

EUR integer cents; server-side role/ownership; synthetic data; terminal removal; no tenants/Redis; real Next and PostgreSQL.

## Review focus

Unauthorized direct API calls; suspension with existing session; duplicate contact submissions; malformed URL filters; mobile overflow and missing form error feedback.

## Task 1 — Domain and persistence

Files: src/modules/marketplace/domain/_, src/shared/db/_, scripts/*, tests/domain.test.ts, tests/integration.test.ts.
Interfaces: assertActive(actor), assertPublish(actor,asset), match(criteria,asset), MarketplaceStore.transaction(callback).

- [x] Write failing policy, money, matching and status tests; run npm test.
- [x] Implement policies; rerun npm test.
- [x] Define schema and migration; seed the PostgreSQL schema with stable Faker fixtures (PGlite used for sandbox validation; native PostgreSQL remains pending).

## Task 2 — Application and auth

Files: src/modules/marketplace/application/service.ts, infrastructure/store.ts, shared/auth/_, app/api/_.
Interface: MarketplaceService.execute(actorId,command); readModel(actorId,query).

- [x] Test real DB ownership, suspend, reactivation, removed terminal, duplicate contact and privacy failures.
- [x] Implement transaction boundary and Better Auth adapters; pass tests.

## Task 3 — Role UI

Files: src/app/_, src/shared/ui/_, tests/marketplace.spec.ts.

- [x] Write and run browser tests for login/filter/detail/contact/reload, seller publish/profile, manager suspend.
- [x] Implement responsive catalog, forms, detail, inbox and moderation.
- [x] Pass Playwright on desktop and mobile using supplied browser.

## Task 4 — Delivery

Files: README.md, Dockerfile, compose.yaml, .env.example, docs/verification.md.

- [x] Run typecheck, unit/integration suite, production build, production E2E.
- [x] Review code and resolve important findings with regression tests.
- [x] Package source without secrets, dependencies or DB data; preserve artifact.
- [ ] Deploy if compatible hosting and PostgreSQL credentials available; otherwise report exact blocker and provide reproducible deployment steps.
