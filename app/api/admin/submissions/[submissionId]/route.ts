import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { sendTelegramNotification } from "@/lib/notifications";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  action: z.enum(["start_review", "approve", "revision", "comment", "open_next"]),
  comment: z.string().trim().max(4_000).optional(),
}).refine((value) => value.action !== "revision" || Boolean(value.comment), { message: "При возврате на доработку нужен комментарий" });

export async function PATCH(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const admin = await getActiveProfile(auth.session, "admin");
    const { submissionId } = await context.params;
    z.uuid().parse(submissionId);
    const input = schema.parse(await request.json());
    const supabase = getAdminClient();
    if (input.action === "open_next") {
      const { data: existing } = await supabase.from("submissions").select("enrollment_id,lesson_id,user_id,profiles!submissions_user_id_fkey(telegram_user_id)").eq("id", submissionId).single();
      if (!existing) throw new Error("Задание не найдено");
      const { data: nextLessonId, error } = await supabase.rpc("unlock_next_lesson", {
        p_admin_id: admin.id, p_enrollment_id: existing.enrollment_id, p_lesson_id: existing.lesson_id,
      });
      if (error) throw new Error("Не удалось открыть следующий урок");
      const student = existing.profiles as unknown as { telegram_user_id: string | number } | null;
      if (nextLessonId && student) await sendTelegramNotification({
        userId: existing.user_id,
        telegramUserId: String(student.telegram_user_id),
        type: "lesson_unlocked",
        relatedEntityId: nextLessonId,
        idempotencyKey: `manual-lesson-unlocked:${existing.enrollment_id}:${nextLessonId}`,
      });
      invalidateAdminData();
      return NextResponse.json({ nextLessonId });
    }

    const { data: submission, error } = await supabase.rpc("review_submission", {
      p_admin_id: admin.id,
      p_submission_id: submissionId,
      p_action: input.action,
      p_comment: input.comment ?? null,
    });
    if (error || !submission) throw new Error(error?.message === "comment required" ? "Нужен комментарий" : "Не удалось обновить задание");

    if (input.action === "approve" || input.action === "revision") {
      const [studentResult, lessonResult, enrollmentResult] = await Promise.all([
        supabase.from("profiles").select("telegram_user_id").eq("id", submission.user_id).single(),
        supabase.from("lessons").select("unlock_rule").eq("id", submission.lesson_id).single(),
        supabase.from("enrollments").select("status").eq("id", submission.enrollment_id).single(),
      ]);
      const student = studentResult.data;
      if (student) await sendTelegramNotification({
        userId: submission.user_id,
        telegramUserId: String(student.telegram_user_id),
        type: input.action === "approve" ? "submission_approved" : "revision_requested",
        relatedEntityId: submission.id,
        idempotencyKey: `${input.action}:${submission.id}:${submission.updated_at}`,
      });
      if (student && input.action === "approve" && lessonResult.data?.unlock_rule === "after_approval") {
        await sendTelegramNotification({
          userId: submission.user_id,
          telegramUserId: String(student.telegram_user_id),
          type: "lesson_unlocked",
          relatedEntityId: submission.lesson_id,
          idempotencyKey: `lesson-unlocked-by-approval:${submission.id}`,
        });
      }
      if (student && input.action === "approve" && enrollmentResult.data?.status === "completed") {
        await sendTelegramNotification({
          userId: submission.user_id,
          telegramUserId: String(student.telegram_user_id),
          type: "course_completed",
          relatedEntityId: submission.enrollment_id,
          idempotencyKey: `course-completed:${submission.enrollment_id}`,
        });
      }
    }
    invalidateAdminData();
    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Некорректные данные" : error instanceof Error ? error.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
