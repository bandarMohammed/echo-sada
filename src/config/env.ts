/**
 * SERVER-ONLY environment configuration.
 *
 * Never import this module from a client component. Secrets (OpenAI key,
 * database URLs) live here and must never reach the browser bundle.
 * The app reads a typed config object instead of touching process.env
 * scattered across the codebase.
 */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Neon Postgres (pooled + direct). Optional until the DB is provisioned
  // so the app can boot in mock mode during early development.
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),

  // AI provider selection. Defaults to the deterministic mock adapter so
  // the demo runs with no key / offline.
  AI_PROVIDER: z.enum(["openai", "mock"]).default("mock"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),

  // Demo mode opens the app directly into the role/patient switcher.
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  APP_DEFAULT_LOCALE: z.enum(["ar", "en"]).default("ar"),
});

// Treat empty-string env vars (e.g. OPENAI_API_KEY= in .env) as absent so
// optional fields validate correctly.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
);

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

/** True when the real OpenAI adapter can be used. */
export const canUseOpenAI = env.AI_PROVIDER === "openai" && !!env.OPENAI_API_KEY;

/** Effective AI provider, degrading to mock when no key is present. */
export const effectiveAiProvider: "openai" | "mock" = canUseOpenAI
  ? "openai"
  : "mock";
