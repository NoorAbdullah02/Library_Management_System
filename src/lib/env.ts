import { z } from "zod";

/**
 * Type-safe, validated environment variables.
 *
 * Server-only secrets live in `server`; anything that must reach the browser
 * is namespaced under `NEXT_PUBLIC_` and validated in `client`.
 *
 * Validation is skipped when `SKIP_ENV_VALIDATION` is set (useful for Docker
 * image builds where secrets are injected at runtime, and for linting).
 */

const numericString = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : Number(v)))
    .pipe(z.number().positive());

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid connection string"),

  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),

  // Optional integrations — empty string means "not configured".
  BREVO_API_KEY: z.string().optional().default(""),
  BREVO_SENDER_EMAIL: z.string().optional().default("no-reply@lumina.local"),
  BREVO_SENDER_NAME: z.string().optional().default("Lumina Library"),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),

  DEFAULT_LOAN_DAYS: numericString(14),
  DEFAULT_FINE_PER_DAY: numericString(0.5),
  DEFAULT_MAX_BORROW_LIMIT: numericString(5),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
});

const skipValidation =
  !!process.env.SKIP_ENV_VALIDATION || process.env.npm_lifecycle_event === "lint";

function formatErrors(error: z.ZodError) {
  return error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
}

function buildEnv() {
  if (skipValidation) {
    return {
      ...process.env,
      DEFAULT_LOAN_DAYS: Number(process.env.DEFAULT_LOAN_DAYS ?? 14),
      DEFAULT_FINE_PER_DAY: Number(process.env.DEFAULT_FINE_PER_DAY ?? 0.5),
      DEFAULT_MAX_BORROW_LIMIT: Number(
        process.env.DEFAULT_MAX_BORROW_LIMIT ?? 5,
      ),
    } as unknown as z.infer<typeof serverSchema> &
      z.infer<typeof clientSchema>;
  }

  const parsedServer = serverSchema.safeParse(process.env);
  const parsedClient = clientSchema.safeParse(process.env);

  if (!parsedServer.success || !parsedClient.success) {
    const errors = [
      parsedServer.success ? "" : formatErrors(parsedServer.error),
      parsedClient.success ? "" : formatErrors(parsedClient.error),
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(
      `❌ Invalid environment variables:\n${errors}\n\n` +
        `Copy .env.example to .env and fill in the required values.`,
    );
  }

  return { ...parsedServer.data, ...parsedClient.data };
}

export const env = buildEnv();

/** Feature flags derived from configured integrations. */
export const features = {
  email: Boolean(env.BREVO_API_KEY),
  uploads: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY),
} as const;
