import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ key: z.enum(["branding", "support", "uploads", "notifications"]), value: z.record(z.string(), z.unknown()) });

export async function PATCH(request: Request) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    await getActiveProfile(auth.session, "admin");
    const input = schema.parse(await request.json());
    const { data, error } = await getAdminClient().from("app_settings").upsert({ key: input.key, value: input.value, updated_at: new Date().toISOString() }).select("*").single();
    if (error) throw new Error("Не удалось сохранить настройки");
    invalidateAdminData({ catalog: true });
    return NextResponse.json({ setting: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректные настройки" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
