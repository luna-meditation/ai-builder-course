import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ courseId: z.uuid(), lessonIds: z.array(z.uuid()).min(1).max(100) });

export async function PATCH(request: Request) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const admin = await getActiveProfile(auth.session, "admin");
    const input = schema.parse(await request.json());
    const { error } = await getAdminClient().rpc("reorder_lessons", { p_admin_id: admin.id, p_course_id: input.courseId, p_lesson_ids: input.lessonIds });
    if (error) throw new Error("Не удалось изменить порядок уроков");
    invalidateAdminData();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректный порядок" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
