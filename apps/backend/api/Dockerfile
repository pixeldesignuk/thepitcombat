FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/api/package.json apps/backend/api/

FROM base AS build
RUN pnpm install --frozen-lockfile --filter @pit/api...
COPY apps/backend/api/ apps/backend/api/
RUN pnpm --filter @pit/api build

FROM base AS production-dependencies
RUN pnpm install --frozen-lockfile --prod --filter @pit/api...

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/apps/backend/api/node_modules ./apps/backend/api/node_modules
COPY --from=build /app/apps/backend/api/package.json ./apps/backend/api/package.json
COPY --from=build /app/apps/backend/api/dist ./apps/backend/api/dist
USER node
EXPOSE 3000
CMD ["node", "apps/backend/api/dist/server.js"]
