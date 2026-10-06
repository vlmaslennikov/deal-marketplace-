#!/usr/bin/env bash
# Local sandbox verification only. Production/database CI uses normal PostgreSQL.
set -euo pipefail
node --import tsx scripts/pglite-dev.ts > /tmp/deal-pg-qa.log 2>&1 &
DEAL_PG_PID=$!
node --env-file-if-exists=.env scripts/start.mjs > /tmp/deal-web-qa.log 2>&1 &
DEAL_WEB_PID=$!
trap 'kill "$DEAL_WEB_PID" "$DEAL_PG_PID" 2>/dev/null || true' EXIT
node -e "let n=0;const check=()=>Promise.all([fetch('http://localhost:3000/login'),new Promise((ok,no)=>{const s=require('net').connect(5432,'127.0.0.1',()=>{s.end();ok()});s.on('error',no)})]).then(()=>process.exit()).catch(()=>{if(++n>80)process.exit(1);setTimeout(check,250)});check()"
npm run db:migrate
npm run db:seed
npm run test:integration
npm run test:e2e
