import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { sendTelegramNotification } from "@/lib/notifications";
import { getAdminClient } from "@/lib/supabase/admin";
import { invalidateStudentData } from "@/lib/student-cache";

const schema = z.object({
  userId: z.uuid(),
  courseId: z.uuid(),
  action: z.enum(["grant", "revoke"]),
});

export async function POST(request: Request) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const admin = await getActiveProfile(auth.session, "admin");
    const input = schema.parse(await request.json());
    const supabase = getAdminClient();
    if (input.action === "grant") {
      const { data: enrollment, error } = await supabase.rpc("grant_course_access", {
        p_admin_id: admin.id,
        p_user_id: input.userId,
        p_course_id: input.courseId,
      });
      if (error || !enrollment) throw new Error("Не удалось выдать доступ");
      const { data: user } = await supabase.from("profiles").select("telegram_user_id").eq("id", input.userId).single();
      if (user) await sendTelegramNotification({
        userId: input.userId,
        telegramUserId: String(user.telegram_user_id),
        type: "access_granted",
        relatedEntityId: enrollment.id,
        idempotencyKey: `access-granted:${enrollment.id}:${enrollment.access_granted_at}`,
      });
      invalidateAdminData();
      invalidateStudentData(input.userId);
      return NextResponse.json({ enrollment });
    }

    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .update({ status: "revoked", access_revoked_at: new Date().toISOString() })
      .eq("user_id", input.userId)
      .eq("course_id", input.courseId)
      .select("*")
      .single();
    if (error) throw new Error("Не удалось отозвать доступ");
    await supabase.from("audit_log").insert({ actor_id: admin.id, action: "access_revoked", entity_type: "enrollment", entity_id: enrollment.id });
    invalidateAdminData();
    invalidateStudentData(input.userId);
    return NextResponse.json({ enrollment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректные данные" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
