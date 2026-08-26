import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  AUTH_SESSION_SECRET: z.string().min(32),
  AUTH_COOKIE_NAME: z.string().min(1).default("bsa_session"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET,
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
