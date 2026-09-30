import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Use process.env (not env()) so `prisma generate` works when DATABASE_URL is
 * unset — CI docker_build and local typegen only need the schema. Migrate/db
 * commands still require a real URL and fail clearly when it is missing.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
