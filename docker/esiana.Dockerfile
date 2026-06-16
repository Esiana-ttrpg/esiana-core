FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/storage-s3/package.json packages/storage-s3/
RUN npm ci
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared
COPY packages ./packages
ARG PRISMA_DATABASE_PROVIDER=postgresql
RUN if [ "$PRISMA_DATABASE_PROVIDER" = "sqlite" ]; then \
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' backend/prisma/schema.prisma; \
fi \
  && npm run db:generate --workspace=backend
RUN npm run build

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

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/openapi ./backend/dist/backend/openapi
COPY --from=build /app/backend/package.json ./backend/
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
ENTRYPOINT ["/entrypoint.sh"]
