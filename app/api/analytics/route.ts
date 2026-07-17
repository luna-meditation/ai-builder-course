import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { trackEvent } from "@/lib/analytics";

const allowedEvents = [
  "app_opened", "lesson_opened", "prompt_copied", "assignment_started", "draft_saved",
  "assignment_submitted", "revision_received", "assignment_resubmitted", "lesson_completed", "course_completed",
] as const;
const schema = z.object({ event: z.enum(allowedEvents), properties: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const input = schema.parse(await request.json());
    await trackEvent(auth.session.profileId, input.event, input.properties);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Некорректное событие" }, { status: 400 });
  }
}
