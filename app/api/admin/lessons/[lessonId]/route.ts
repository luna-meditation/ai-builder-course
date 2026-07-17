import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  title: z.string().trim().min(3).max(180).optional(), shortDescription: z.string().trim().max(1_000).optional(),
  expectedResult: z.string().trim().max(2_000).optional(), assignmentDescription: z.string().trim().max(4_000).optional(),
  videoType: z.enum(["youtube", "vimeo", "mp4", "external"]).nullable().optional(),
  videoUrl: z.union([z.url(), z.literal("")]).nullable().optional(), unlockRule: z.enum(["after_submission", "after_approval", "manual", "none"]).optional(),
  assignmentRequired: z.boolean().optional(), isPublished: z.boolean().optional(), lessonOrder: z.number().int().positive().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    await getActiveProfile(auth.session, "admin");
    const { lessonId } = await context.params;
    z.uuid().parse(lessonId);
    const input = schema.parse(await request.json());
    const changes: Record<string, unknown> = {};
    const mapping: Record<string, string> = { shortDescription: "short_description", expectedResult: "expected_result", assignmentDescription: "assignment_description", videoType: "video_type", videoUrl: "video_url", unlockRule: "unlock_rule", assignmentRequired: "assignment_required", isPublished: "is_published", lessonOrder: "lesson_order" };
    for (const [key, value] of Object.entries(input)) changes[mapping[key] ?? key] = key === "videoUrl" && value === "" ? null : value;
    const { data, error } = await getAdminClient().from("lessons").update(changes).eq("id", lessonId).select("*").single();
    if (error) throw new Error("Не удалось сохранить урок");
    invalidateAdminData();
    return NextResponse.json({ lesson: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Проверьте поля урока" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
