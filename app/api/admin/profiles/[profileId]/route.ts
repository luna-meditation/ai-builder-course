import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";
import { invalidateStudentData } from "@/lib/student-cache";

const schema = z.object({
  role: z.enum(["student", "admin", "mentor"]).optional(),
  isBlocked: z.boolean().optional(),
}).refine((value) => value.role !== undefined || value.isBlocked !== undefined, "Нет изменений");

export async function PATCH(request: Request, context: { params: Promise<{ profileId: string }> }) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const admin = await getActiveProfile(auth.session, "admin");
    const { profileId } = await context.params;
    z.uuid().parse(profileId);
    const input = schema.parse(await request.json());
    if (profileId === admin.id && (input.role && input.role !== "admin" || input.isBlocked)) {
      return NextResponse.json({ error: "Нельзя лишить прав текущего администратора" }, { status: 409 });
    }
    const changes: Record<string, unknown> = {};
    if (input.role !== undefined) changes.role = input.role;
    if (input.isBlocked !== undefined) changes.is_blocked = input.isBlocked;
    const { data, error } = await getAdminClient().from("profiles").update(changes).eq("id", profileId).select("*").single();
    if (error) throw new Error("Не удалось обновить профиль");
    await getAdminClient().from("audit_log").insert({ actor_id: admin.id, action: "profile_updated", entity_type: "profile", entity_id: profileId, details: changes });
    invalidateAdminData();
    invalidateStudentData(profileId);
    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректные данные" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
