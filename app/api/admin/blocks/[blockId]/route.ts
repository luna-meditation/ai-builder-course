import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateAdminData } from "@/lib/admin-cache";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ content: z.record(z.string(), z.unknown()).optional(), settings: z.record(z.string(), z.unknown()).optional(), blockOrder: z.number().int().nonnegative().optional() });

async function authorize() {
  const auth = await requireApiSession("admin");
  if ("error" in auth) return auth;
  await getActiveProfile(auth.session, "admin");
  return auth;
}

export async function PATCH(request: Request, context: { params: Promise<{ blockId: string }> }) {
  const auth = await authorize();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { blockId } = await context.params; z.uuid().parse(blockId);
    const input = schema.parse(await request.json());
    const changes = {
      ...(input.content ? { content: input.content } : {}),
      ...(input.settings ? { settings: input.settings } : {}),
      ...(input.blockOrder !== undefined ? { block_order: input.blockOrder } : {}),
    };
    const { data, error } = await getAdminClient().from("lesson_blocks").update(changes).eq("id", blockId).select("*").single();
    if (error) throw new Error("Не удалось сохранить блок");
    invalidateAdminData();
    return NextResponse.json({ block: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Некорректный блок" : error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ blockId: string }> }) {
  const auth = await authorize();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { blockId } = await context.params; z.uuid().parse(blockId);
    const { error } = await getAdminClient().from("lesson_blocks").delete().eq("id", blockId);
    if (error) throw new Error("Не удалось удалить блок");
    invalidateAdminData();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка" }, { status: 400 });
  }
}
