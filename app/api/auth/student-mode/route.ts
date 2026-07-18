import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { canEnterStudentPreview } from "@/lib/auth/access";
import { createSession, getSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { invalidateStudentData } from "@/lib/student-cache";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ mode: z.enum(["admin", "preview", "learning"]) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  if (!canEnterStudentPreview(session)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  try {
    const { mode } = schema.parse(await request.json());
    const profile = await getActiveProfile(session, "admin");

    if (mode === "learning") {
      const supabase = getAdminClient();
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id")
        .eq("status", "published")
        .order("created_at")
        .limit(1)
        .single();
      if (courseError || !course) throw new Error("Опубликованный курс не найден");

      const { error: enrollmentError } = await supabase.rpc("enable_admin_student_mode", {
        p_admin_id: profile.id,
        p_course_id: course.id,
      });
      if (enrollmentError) {
        console.error("admin_student_mode_enrollment_failed", { code: enrollmentError.code });
        throw new Error("Не удалось создать ученическое зачисление");
      }
      invalidateStudentData(profile.id);
      invalidateAdminData();
    }

    await createSession({
      ...session,
      previewAsStudent: mode === "preview",
      studentMode: mode === "admin" ? null : mode,
    });
    return NextResponse.json({
      ok: true,
      mode,
      destination: mode === "admin" ? "/admin" : "/course",
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Некорректный режим"
      : error instanceof Error ? error.message : "Не удалось переключить режим";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
