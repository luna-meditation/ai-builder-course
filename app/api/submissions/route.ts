import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { sendTelegramNotification } from "@/lib/notifications";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  lessonId: z.uuid(),
  enrollmentId: z.uuid(),
  submissionId: z.uuid().nullable().optional(),
  textContent: z.string().max(20_000).default(""),
  externalUrl: z.union([z.url(), z.literal("")]).default(""),
  action: z.enum(["draft", "submit"]),
});

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const profile = await getActiveProfile(auth.session);
    await enforceRateLimit(`submission:${profile.id}`, 30, 60);
    const input = schema.parse(await request.json());
    const supabase = getAdminClient();
    const { data: submission, error } = await supabase.rpc("save_submission", {
      p_user_id: profile.id,
      p_enrollment_id: input.enrollmentId,
      p_lesson_id: input.lessonId,
      p_submission_id: input.submissionId ?? null,
      p_text_content: input.textContent,
      p_external_url: input.externalUrl,
      p_submit: input.action === "submit",
    });
    if (error || !submission) {
      console.error("save_submission_failed", { code: error?.code });
      return NextResponse.json({ error: "Не удалось сохранить задание. Проверьте данные." }, { status: 400 });
    }

    if (input.action === "submit") {
      const [lessonResult, enrollmentResult] = await Promise.all([
        supabase.from("lessons").select("unlock_rule").eq("id", input.lessonId).single(),
        supabase.from("enrollments").select("status").eq("id", input.enrollmentId).single(),
      ]);
      await sendTelegramNotification({
        userId: profile.id,
        telegramUserId: String(profile.telegram_user_id),
        type: "submission_sent",
        relatedEntityId: submission.id,
        idempotencyKey: `submission-sent:${submission.id}`,
      });
      if (lessonResult.data?.unlock_rule === "after_submission") {
        await sendTelegramNotification({
          userId: profile.id,
          telegramUserId: String(profile.telegram_user_id),
          type: "lesson_unlocked",
          relatedEntityId: input.lessonId,
          idempotencyKey: `lesson-unlocked-by:${submission.id}`,
        });
      }
      if (enrollmentResult.data?.status === "completed") {
        await sendTelegramNotification({
          userId: profile.id,
          telegramUserId: String(profile.telegram_user_id),
          type: "course_completed",
          relatedEntityId: input.enrollmentId,
          idempotencyKey: `course-completed:${input.enrollmentId}`,
        });
      }
    }
    return NextResponse.json({ submission });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof Error && error.name === "RateLimitError" ? 429 : 500;
    return NextResponse.json({ error: status === 500 ? "Не удалось обработать задание" : error instanceof Error ? error.message : "Ошибка" }, { status });
  }
}
