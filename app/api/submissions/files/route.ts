import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";

const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "video/mp4", "video/quicktime",
]);

function safeName(name: string) {
  const cleaned = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "file").slice(-100);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const profile = await getActiveProfile(auth.session);
    await enforceRateLimit(`file-upload:${profile.id}`, 20, 60);
    const form = await request.formData();
    const submissionId = z.uuid().parse(form.get("submissionId"));
    const lessonId = z.uuid().parse(form.get("lessonId"));
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Файл не найден" }, { status: 400 });

    const supabase = getAdminClient();
    const [{ data: submission }, { data: uploadSettings }] = await Promise.all([
      supabase.from("submissions").select("id,user_id,status,lesson_id").eq("id", submissionId).single(),
      supabase.from("app_settings").select("value").eq("key", "uploads").maybeSingle(),
    ]);
    if (!submission || submission.user_id !== profile.id || submission.lesson_id !== lessonId || submission.status !== "draft") {
      return NextResponse.json({ error: "К этому черновику нельзя прикрепить файл" }, { status: 403 });
    }
    const maxMb = Number((uploadSettings?.value as { max_file_size_mb?: number } | undefined)?.max_file_size_mb ?? 25);
    if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: "Этот формат файла не поддерживается" }, { status: 415 });
    if (file.size <= 0 || file.size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `Размер файла не должен превышать ${maxMb} МБ` }, { status: 413 });
    }

    const path = `submissions/${profile.telegram_user_id}/${lessonId}/${submissionId}/${randomUUID()}-${safeName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("submission-files").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
    const { data: record, error: recordError } = await supabase
      .from("submission_files")
      .insert({ submission_id: submissionId, storage_path: path, original_name: file.name.slice(0, 255), mime_type: file.type, file_size: file.size })
      .select("*")
      .single();
    if (recordError) {
      await supabase.storage.from("submission-files").remove([path]);
      return NextResponse.json({ error: "Не удалось сохранить файл" }, { status: 500 });
    }
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof Error && error.name === "RateLimitError" ? 429 : 500;
    return NextResponse.json({ error: status === 500 ? "Ошибка загрузки" : error instanceof Error ? error.message : "Ошибка" }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const profile = await getActiveProfile(auth.session);
    const fileId = z.uuid().parse(request.nextUrl.searchParams.get("fileId"));
    const supabase = getAdminClient();
    const { data: record } = await supabase.from("submission_files").select("*, submissions!inner(user_id,status)").eq("id", fileId).single();
    const submission = record?.submissions as unknown as { user_id: string; status: string } | undefined;
    if (!record || submission?.user_id !== profile.id || submission.status !== "draft") {
      return NextResponse.json({ error: "Файл нельзя удалить" }, { status: 403 });
    }
    const { error: storageError } = await supabase.storage.from("submission-files").remove([record.storage_path]);
    if (storageError) return NextResponse.json({ error: "Не удалось удалить файл" }, { status: 500 });
    await supabase.from("submission_files").delete().eq("id", fileId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Некорректный файл" }, { status: 400 });
  }
}
