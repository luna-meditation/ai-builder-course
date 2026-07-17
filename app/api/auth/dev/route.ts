import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { devSession } from "@/lib/dev-fixtures";
import { isDevLoginEnabled, isStandaloneDevPreview } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ role: z.enum(["student", "admin", "no_access"]) });
const devUsers = { student: "100000001", admin: "100000002", no_access: "100000003" } as const;

export async function POST(request: Request) {
  if (!isDevLoginEnabled()) return NextResponse.json({ error: "DEV_MODE отключён" }, { status: 404 });
  try {
    const { role } = schema.parse(await request.json());
    if (isStandaloneDevPreview()) {
      const session = devSession(role);
      await createSession(session);
      return NextResponse.json({ ok: true, role: session.role, preview: true });
    }
    const { data: profile, error } = await getAdminClient()
      .from("profiles")
      .select("id,telegram_user_id,username,first_name,role,is_blocked")
      .eq("telegram_user_id", devUsers[role])
      .single();
    if (error || !profile) return NextResponse.json({ error: "Сначала примените development seed" }, { status: 409 });
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
    return NextResponse.json({ error: error instanceof z.ZodError ? "Неверная роль" : "Не удалось войти" }, { status: 400 });
  }
}
