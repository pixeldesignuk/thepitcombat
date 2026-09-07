FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/dash/package.json apps/web/dash/
RUN pnpm install --frozen-lockfile --filter @pit/dash...
COPY apps/web/dash/ apps/web/dash/
RUN pnpm --filter @pit/dash build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/apps/web/dash/dist ./dist
COPY apps/web/dash/server.mjs apps/web/dash/proxy.mjs ./
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
