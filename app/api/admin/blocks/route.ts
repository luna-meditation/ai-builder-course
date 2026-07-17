import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";

const blockType = z.enum(["heading", "paragraph", "callout", "checklist", "prompt", "image", "video", "file", "divider"]);
const schema = z.object({ lessonId: z.uuid(), blockType, blockOrder: z.number().int().nonnegative(), content: z.record(z.string(), z.unknown()), settings: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request) {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    await getActiveProfile(auth.session, "admin");
    const input = schema.parse(await request.json());
    const { data, error } = await getAdminClient().from("lesson_blocks").insert({ lesson_id: input.lessonId, block_type: input.blockType, block_order: input.blockOrder, content: input.content, settings: input.settings }).select("*").single();
    if (error) throw new Error("Не удалось добавить блок");
    invalidateAdminData();
    return NextResponse.json({ block: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректный блок" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
