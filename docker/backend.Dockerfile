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
# Prisma client must match runtime DATABASE_URL provider (Compose defaults to PostgreSQL).
ARG PRISMA_DATABASE_PROVIDER=postgresql
RUN if [ "$PRISMA_DATABASE_PROVIDER" = "sqlite" ]; then \
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' backend/prisma/schema.prisma; \
fi \
  && npm run db:generate --workspace=backend
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S esiana && adduser -S esiana -G esiana
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/openapi ./backend/dist/backend/openapi
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/packages ./packages
COPY --from=build /app/shared ./shared
COPY docker/backend-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data/uploads && chown -R esiana:esiana /data/uploads
USER esiana
EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
