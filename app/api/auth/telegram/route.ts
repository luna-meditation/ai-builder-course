import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { isBootstrapAdminTelegramId } from "@/lib/auth/access";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/auth/telegram";
import { getAdminTelegramIds, getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ initData: z.string().min(1).max(16_384) });

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    await enforceRateLimit(`telegram-auth:${ip}`, 20, 60);
    const { initData } = schema.parse(await request.json());
    const env = getServerEnv();
    const telegramUser = verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
    const telegramId = String(telegramUser.id);
    const isBootstrapAdmin = isBootstrapAdminTelegramId(telegramId, getAdminTelegramIds());

    const { data: profile, error } = await getAdminClient()
      .from("profiles")
      .upsert(
        {
          telegram_user_id: telegramUser.id,
          username: telegramUser.username ?? null,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name ?? null,
          photo_url: telegramUser.photo_url ?? null,
          ...(isBootstrapAdmin ? { role: "admin" as const } : {}),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "telegram_user_id" },
      )
      .select("id,telegram_user_id,username,first_name,role,is_blocked")
      .single();

    if (error || !profile) throw new Error("Не удалось сохранить профиль");
    if (profile.is_blocked) return NextResponse.json({ error: "Профиль заблокирован" }, { status: 403 });

    await createSession({
      profileId: profile.id,
      telegramUserId: String(profile.telegram_user_id),
      username: profile.username,
      firstName: profile.first_name,
      role: profile.role,
    });
    return NextResponse.json({ ok: true, role: profile.role });
  } catch (error) {
    const status = error instanceof TelegramAuthError || error instanceof z.ZodError ? 400 : error instanceof Error && error.name === "RateLimitError" ? 429 : 500;
    const message = status === 500 ? "Не удалось войти. Попробуйте ещё раз." : error instanceof Error ? error.message : "Ошибка авторизации";
    if (status === 500) console.error("telegram_auth_failed", { error: error instanceof Error ? error.name : "Unknown" });
    return NextResponse.json({ error: message }, { status });
  }
}
