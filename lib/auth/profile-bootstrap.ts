import "server-only";

import { telegramProfileRpcInput } from "@/lib/auth/bootstrap";
import type { TelegramUser } from "@/lib/auth/telegram";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Enrollment, Profile } from "@/lib/types";

export type TelegramProfileBootstrap = Pick<
  Profile,
  | "id"
  | "telegram_user_id"
  | "username"
  | "first_name"
  | "last_name"
  | "language_code"
  | "photo_url"
  | "role"
  | "is_blocked"
  | "created_at"
  | "last_seen_at"
> & { enrollment_status: Enrollment["status"] | null; is_new: boolean };

export async function upsertVerifiedTelegramProfile(user: TelegramUser, bootstrapAdmin: boolean) {
  const { data, error } = await getAdminClient()
    .rpc("upsert_telegram_profile", telegramProfileRpcInput(user, bootstrapAdmin))
    .single();

  if (error || !data) {
    console.error("telegram_profile_upsert_failed", { code: error?.code });
    throw new Error("Не удалось сохранить профиль");
  }
  return data as TelegramProfileBootstrap;
}
