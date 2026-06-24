import { defineConfig } from "drizzle-kit";

// Drizzle Kit reads the raw env directly (it runs outside the Next.js runtime),
// so we avoid importing the validated env module here.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and configure your Neon/Postgres connection string.",
  );
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
