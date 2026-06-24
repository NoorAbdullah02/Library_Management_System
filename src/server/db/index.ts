import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Singleton Postgres client.
 *
 * In development Next.js hot-reloads modules, which would otherwise open a new
 * pool on every change and exhaust connections. We cache the client on
 * `globalThis` to survive HMR. In production a fresh module graph is created
 * per server instance, so the cache is effectively a no-op.
 */
const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.client ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required for transaction-pooled connections (Neon/PgBouncer)
  });

if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema, logger: env.NODE_ENV === "development" ? false : false });

export type Database = typeof db;
export { schema };
