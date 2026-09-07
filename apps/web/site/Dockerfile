FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/site/package.json apps/web/site/

FROM base AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
RUN pnpm install --frozen-lockfile --filter @pit/site...
COPY apps/web/site/ apps/web/site/
COPY operations/ operations/
# Public origin pins Astro's trusted proxy/host policy in the server manifest.
ARG PUBLIC_SITE_URL
RUN PUBLIC_SITE_URL=$PUBLIC_SITE_URL pnpm --filter @pit/site build

FROM base AS production-dependencies
RUN pnpm install --frozen-lockfile --prod --filter @pit/site...

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/apps/web/site/node_modules ./apps/web/site/node_modules
COPY --from=build /app/apps/web/site/package.json ./apps/web/site/package.json
COPY --from=build /app/apps/web/site/dist ./apps/web/site/dist
USER node
EXPOSE 3000
CMD ["node", "apps/web/site/dist/server/entry.mjs"]
