# Debian/glibc base (not alpine/musl): onnxruntime-node + @huggingface/transformers
# ship glibc-only prebuilds, so the AI features (background removal, LaMa inpainting)
# only load on glibc.
FROM node:24-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Don't pull Playwright browsers during `npm ci` — they're only needed for e2e.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# Toolchain so any native dep without a prebuilt binary for this Node ABI can compile.
# (Only in this intermediate stage — never in the final runner image.)
RUN apt-get update && apt-get install -y --no-install-recommends \
	python3 make g++ ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* prisma.config.ts ./
COPY prisma ./prisma/
RUN npm ci


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# Migration runner: reuses the builder (full node_modules incl. the Prisma CLI +
# tsx, the generated client, prisma.config.ts, and prisma/{schema,migrations}).
# Applies pending migrations then the idempotent prod seed. Used by the `migrate`
# compose service; placed before `runner` so `runner` stays the default target.
FROM builder AS migrator
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.prod.ts"]


# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
	&& useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Persistent, writable cache for downloaded AI model weights (mounted as a volume
# in prod so models aren't re-downloaded on every redeploy).
RUN mkdir -p /app/.cache && chown -R nextjs:nodejs /app/.cache
ENV LAMA_CACHE_DIR=/app/.cache/lama
ENV HF_HOME=/app/.cache/huggingface

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD HOSTNAME="0.0.0.0" node server.js
