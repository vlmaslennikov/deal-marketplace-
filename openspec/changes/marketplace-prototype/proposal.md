# Deal marketplace prototype

## Why

Deliver a usable two-sided M&A discovery/contact loop within the assignment's 24-hour scope. Product reference: the assignment marketplace catalog (reviewed 2026-10-05); borrow structured jurisdiction/licence discovery without scraping private data.

## What changes

Buyer profiles and acquisition criteria; seller draft/edit/publish; searchable asset and buyer directories; persisted private conversations; manager search, suspension, reactivation and removal; explainable rule-based matching.

## Capabilities

identity-access, marketplace, messaging, moderation, matching.

## Impact

New Next.js modular monolith and PostgreSQL schema. No Redis, tenants, payments, files, KYC or live chat. Hosting requires a Node-compatible platform and a managed PostgreSQL URL; do not replace required PostgreSQL with SQLite to fit a hosting tool.
