FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time auth initialization only. Real secret is supplied at runtime.
RUN node --input-type=module -e "import {randomBytes} from 'node:crypto'; import {spawnSync} from 'node:child_process'; const r=spawnSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),BETTER_AUTH_URL:'http://localhost:3000'}}); process.exit(r.status??1)"

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
