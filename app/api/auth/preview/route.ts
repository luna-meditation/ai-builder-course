import { NextResponse } from "next/server";
import { z } from "zod";
import { canEnterStudentPreview } from "@/lib/auth/access";
import { createSession, getSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";

const schema = z.object({ enabled: z.boolean() });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  if (!canEnterStudentPreview(session)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  try {
    await getActiveProfile(session, "admin");
    const { enabled } = schema.parse(await request.json());
    await createSession({
      ...session,
      previewAsStudent: enabled,
      studentMode: enabled ? "preview" : null,
    });
    return NextResponse.json({ ok: true, previewAsStudent: enabled });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? "Некорректный режим" : "Не удалось переключить предпросмотр" },
      { status: 400 },
    );
  }
}
