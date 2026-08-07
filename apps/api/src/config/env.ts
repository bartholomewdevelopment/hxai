import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Load the repo-root .env — one file for the whole monorepo.
 *
 * Found by walking up from the working directory rather than from the module's
 * own path, so it resolves identically whether the code is running from
 * `src/` under tsx or from the esbuild bundle in `dist/`.
 */
function findRepoEnvFile(): string | undefined {
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate) && existsSync(path.join(dir, 'package.json'))) {
      // The repo root is the one with workspaces; any nearer .env wins anyway.
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

dotenv.config({ path: findRepoEnvFile() });

const providerEnum = <T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.enum(values).default(fallback);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),

  // Provider selection. Everything defaults to `stub`, which is what lets
  // Phase 1 run with no third-party accounts and no API keys.
  LLM_PROVIDER: providerEnum(['stub', 'anthropic'], 'stub'),
  EMBEDDING_PROVIDER: providerEnum(['stub', 'openai', 'voyage', 'cohere'], 'stub'),
  RERANKING_PROVIDER: providerEnum(['stub', 'cohere', 'voyage'], 'stub'),
  STORAGE_PROVIDER: providerEnum(['stub', 's3', 'r2'], 'stub'),
  STT_PROVIDER: providerEnum(['stub', 'openai-whisper', 'deepgram'], 'stub'),
  TTS_PROVIDER: providerEnum(['stub', 'elevenlabs', 'openai'], 'stub'),

  // Credentials for later phases. Optional by design — a missing key is only
  // an error once the matching provider is switched off `stub`.
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('claude-sonnet-5'),
  OPENAI_API_KEY: z.string().optional(),
  VOYAGE_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${issues}\n\nSee .env.example.`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
