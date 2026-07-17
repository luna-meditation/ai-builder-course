import { z } from "zod";

const emptyStringAsUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyStringAsUndefined, z.url().default("http://localhost:3000")),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.preprocess(
    emptyStringAsUndefined,
    z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/).optional(),
  ),
  SESSION_SECRET: z.preprocess(emptyStringAsUndefined, z.string().min(32).optional()),
  ADMIN_TELEGRAM_IDS: z.string().default(""),
  NEXT_PUBLIC_DEV_MODE: z.enum(["true", "false"]).default("false"),
  PAYMENT_WEBHOOK_SECRET: z.preprocess(emptyStringAsUndefined, z.string().min(16).optional()),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Некорректные переменные окружения: ${fields}`);
  }
  return parsed.data;
}

export function isDevLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEV_MODE === "true";
}

export function isStandaloneDevPreview() {
  return isDevLoginEnabled() && !isSupabaseConfigured();
}

export function getAdminTelegramIds() {
  return new Set(
    (process.env.ADMIN_TELEGRAM_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}
