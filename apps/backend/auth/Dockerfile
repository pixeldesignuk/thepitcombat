FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/auth/package.json apps/backend/auth/

FROM base AS build
RUN pnpm install --frozen-lockfile --filter @pit/auth...
COPY apps/backend/auth/ apps/backend/auth/
RUN pnpm --filter @pit/auth build

FROM base AS production-dependencies
RUN pnpm install --frozen-lockfile --prod --filter @pit/auth...

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=:: PORT=3000
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/apps/backend/auth/node_modules ./apps/backend/auth/node_modules
COPY --from=build /app/apps/backend/auth/package.json ./apps/backend/auth/package.json
COPY --from=build /app/apps/backend/auth/dist ./apps/backend/auth/dist
USER node
EXPOSE 3000
CMD ["node", "apps/backend/auth/dist/server.js"]
