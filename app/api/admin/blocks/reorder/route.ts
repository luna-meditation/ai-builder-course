import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ lessonId: z.uuid(), blockIds: z.array(z.uuid()).min(1).max(100) });

export async function PATCH(request: Request) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const admin = await getActiveProfile(auth.session, "admin");
    const input = schema.parse(await request.json());
    const { error } = await getAdminClient().rpc("reorder_lesson_blocks", { p_admin_id: admin.id, p_lesson_id: input.lessonId, p_block_ids: input.blockIds });
    if (error) throw new Error("Не удалось изменить порядок блоков");
    invalidateAdminData();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректный порядок" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
