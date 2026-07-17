import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  id: z.uuid(), title: z.string().trim().min(3).max(160), description: z.string().trim().min(10).max(4_000),
  coverUrl: z.union([z.url(), z.literal("")]).optional(), status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    await getActiveProfile(auth.session, "admin");
    const input = schema.parse(await request.json());
    const { data, error } = await getAdminClient().from("courses").update({
      title: input.title, description: input.description, cover_url: input.coverUrl || null, ...(input.status ? { status: input.status } : {}),
    }).eq("id", input.id).select("*").single();
    if (error) throw new Error("Не удалось сохранить курс");
    invalidateAdminData();
    return NextResponse.json({ course: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Проверьте поля курса" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
