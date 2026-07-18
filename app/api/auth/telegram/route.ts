import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { bootstrapDestination, resolveAccessStatus } from "@/lib/auth/bootstrap";
import { createSession } from "@/lib/auth/session";
import { isBootstrapAdminTelegramId } from "@/lib/auth/access";
import { upsertVerifiedTelegramProfile } from "@/lib/auth/profile-bootstrap";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/auth/telegram";
import { getAdminTelegramIds, getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { invalidateStudentData } from "@/lib/student-cache";

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

    await enforceRateLimit(`telegram-auth-user:${telegramId}`, 20, 60);
    const profile = await upsertVerifiedTelegramProfile(telegramUser, isBootstrapAdmin);
    if (profile.is_blocked) return NextResponse.json({ error: "Профиль заблокирован" }, { status: 403 });

    const accessStatus = resolveAccessStatus({
      isBlocked: profile.is_blocked,
      enrollmentStatus: profile.enrollment_status,
    });

    await createSession({
      profileId: profile.id,
      telegramUserId: String(profile.telegram_user_id),
      username: profile.username,
      firstName: profile.first_name,
      role: profile.role,
      previewAsStudent: false,
      studentMode: null,
      isNewUser: profile.is_new,
    });
    invalidateStudentData(profile.id);
    if (profile.is_new) invalidateAdminData();
    return NextResponse.json({
      ok: true,
      isNew: profile.is_new,
      role: profile.role,
      accessStatus,
      destination: bootstrapDestination(profile.role, accessStatus),
      profile: {
        firstName: profile.first_name,
        username: profile.username,
      },
    });
  } catch (error) {
    const status = error instanceof TelegramAuthError || error instanceof z.ZodError ? 400 : error instanceof Error && error.name === "RateLimitError" ? 429 : 500;
    const message = status === 500 ? "Не удалось войти. Попробуйте ещё раз." : error instanceof Error ? error.message : "Ошибка авторизации";
    if (status === 500) console.error("telegram_auth_failed", { error: error instanceof Error ? error.name : "Unknown" });
    return NextResponse.json({ error: message }, { status });
  }
}
