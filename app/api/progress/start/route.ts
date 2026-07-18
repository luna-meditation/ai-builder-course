import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { invalidateStudentData } from "@/lib/student-cache";

const schema = z.object({ enrollmentId: z.uuid(), lessonId: z.uuid() });

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const input = schema.parse(await request.json());
    const profile = await getActiveProfile(auth.session);
    await enforceRateLimit(`lesson-start:${profile.id}`, 40, 60);
    const supabase = getAdminClient();
    const enrollmentResult = await supabase
      .from("enrollments")
      .select("id")
      .eq("id", input.enrollmentId)
      .eq("user_id", profile.id)
      .in("status", ["active", "completed"])
      .maybeSingle();
    if (!enrollmentResult.data) return NextResponse.json({ error: "Доступ к курсу не найден" }, { status: 403 });

    const { data: started, error } = await supabase
      .from("lesson_progress")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("enrollment_id", input.enrollmentId)
      .eq("lesson_id", input.lessonId)
      .eq("status", "available")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (started) {
      invalidateAdminData();
      invalidateStudentData(profile.id);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof Error && error.name === "RateLimitError" ? 429 : 500;
    return NextResponse.json({ error: status === 500 ? "Не удалось отметить начало урока" : error instanceof Error ? error.message : "Ошибка" }, { status });
  }
}
