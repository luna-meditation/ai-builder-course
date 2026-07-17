import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { sendTelegramNotification } from "@/lib/notifications";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ enrollmentId: z.uuid(), lessonId: z.uuid(), action: z.enum(["unlock", "lock"]) });

export async function PATCH(request: Request) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const admin = await getActiveProfile(auth.session, "admin");
    const input = schema.parse(await request.json());
    const supabase = getAdminClient();
    const { data: enrollment } = await supabase.from("enrollments").select("id,user_id,profiles!enrollments_user_id_fkey(telegram_user_id)").eq("id", input.enrollmentId).single();
    const { data: lesson } = await supabase.from("lessons").select("id").eq("id", input.lessonId).single();
    if (!enrollment || !lesson) throw new Error("Урок или запись не найдены");
    const status = input.action === "unlock" ? "available" : "locked";
    const { data, error } = await supabase.from("lesson_progress").upsert({ enrollment_id: input.enrollmentId, lesson_id: input.lessonId, status, unlocked_at: input.action === "unlock" ? new Date().toISOString() : null }, { onConflict: "enrollment_id,lesson_id" }).select("*").single();
    if (error) throw new Error("Не удалось изменить доступ к уроку");
    await supabase.from("audit_log").insert({ actor_id: admin.id, action: `lesson_${input.action}`, entity_type: "lesson_progress", entity_id: data.id });
    const student = enrollment.profiles as unknown as { telegram_user_id: string | number } | null;
    if (input.action === "unlock" && student) await sendTelegramNotification({
      userId: enrollment.user_id,
      telegramUserId: String(student.telegram_user_id),
      type: "lesson_unlocked",
      relatedEntityId: input.lessonId,
      idempotencyKey: `manual-lesson-unlocked:${input.enrollmentId}:${input.lessonId}`,
    });
    return NextResponse.json({ progress: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректные данные" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
