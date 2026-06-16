FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/storage-s3/package.json packages/storage-s3/
RUN pnpm install --frozen-lockfile \
  && mkdir -p backend/node_modules
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared
COPY packages ./packages
ARG PRISMA_DATABASE_PROVIDER=postgresql
RUN pnpm install --frozen-lockfile
RUN if [ "$PRISMA_DATABASE_PROVIDER" = "sqlite" ]; then \
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' backend/prisma/schema.prisma; \
fi \
  && pnpm --filter backend db:generate
RUN pnpm -r build
RUN cd backend && node --input-type=module -e "import('@esiana/storage-s3')"

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

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/openapi ./backend/dist/backend/openapi
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/packages ./packages
COPY --from=build /app/shared ./shared
COPY --from=build /app/frontend/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx-esiana.conf /etc/nginx/http.d/default.conf
COPY docker/esiana-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && nginx -t

EXPOSE 80 3001
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
