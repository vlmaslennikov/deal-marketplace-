#!/usr/bin/env bash
# Run against a dedicated Neon test database. DATABASE_URL is read from the environment.
set -euo pipefail
: "${DATABASE_URL:?Export the Neon test DATABASE_URL before running this script.}"
node -e 'const url = new URL(process.env.DATABASE_URL); if (!url.hostname.endsWith(".neon.tech") || url.searchParams.get("sslmode") !== "require") { console.error("Expected a Neon PostgreSQL URL with sslmode=require."); process.exit(1); }'
export DEMO_MODE=true
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:3000}"

npm run db:migrate
npm run db:seed
npm run test:integration
npm run build
npm start > /tmp/deal-neon-web-qa.log 2>&1 &
DEAL_WEB_PID=$!
trap 'kill "$DEAL_WEB_PID" 2>/dev/null || true' EXIT
node -e 'let attempt=0;const check=()=>fetch("http://localhost:3000/login").then(r=>{if(!r.ok)throw Error("not ready")}).then(()=>process.exit()).catch(()=>{if(++attempt>80)process.exit(1);setTimeout(check,250)});check()'
npm run test:e2e
