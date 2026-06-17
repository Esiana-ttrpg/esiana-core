FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/storage-s3/package.json packages/storage-s3/
COPY packages/ssrf-guard/package.json packages/ssrf-guard/
COPY packages/plugin-source-policy/package.json packages/plugin-source-policy/
RUN pnpm install --frozen-lockfile \
  && mkdir -p backend/node_modules
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared
COPY packages ./packages
ARG PRISMA_DATABASE_PROVIDER=postgresql
RUN if [ "$PRISMA_DATABASE_PROVIDER" = "sqlite" ]; then \
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' backend/prisma/schema.prisma; \
fi \
  && pnpm --filter backend db:generate
RUN pnpm -r build

RUN pnpm --filter @esiana/backend deploy --prod /prod/backend

RUN set -eux; \
  DEPLOY=/prod/backend; \
  mkdir -p "${DEPLOY}/node_modules/.bin"; \
  cp -a node_modules/prisma "${DEPLOY}/node_modules/"; \
  cp -a node_modules/.bin/prisma "${DEPLOY}/node_modules/.bin/prisma"; \
  if [ -d node_modules/@prisma/engines ]; then \
    mkdir -p "${DEPLOY}/node_modules/@prisma"; \
    cp -a node_modules/@prisma/engines "${DEPLOY}/node_modules/@prisma/"; \
  fi; \
  cd "${DEPLOY}"; \
  node_modules/.bin/prisma generate; \
  node_modules/.bin/prisma --version; \
  node --input-type=module -e "import('@prisma/client').then((m) => { if (!m.PrismaClient) process.exit(1); })"

FROM node:20-alpine AS runtime
WORKDIR /app

LABEL org.opencontainers.image.title="Esiana"
LABEL org.opencontainers.image.description="Self-hosted narrative infrastructure for long-form TTRPG campaigns (nginx + API + SPA)"
LABEL org.opencontainers.image.source="https://github.com/Esiana-ttrpg/esiana-core"
LABEL org.opencontainers.image.vendor="Esiana-ttrpg"

RUN apk add --no-cache nginx su-exec \
  && addgroup -S esiana && adduser -S esiana -G esiana \
  && mkdir -p /data/uploads /app/plugins /run/nginx \
  && chown -R esiana:esiana /data/uploads /app/plugins

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package.json
COPY --from=build /prod/backend /app/backend
COPY --from=build /app/frontend/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx-esiana.conf /etc/nginx/http.d/default.conf
COPY docker/esiana-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && nginx -t

EXPOSE 80 3001
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
