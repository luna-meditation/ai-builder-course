"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { ArrowRight, CheckCircle2, File, ImageIcon, Link2, MessageSquare, Paperclip, RotateCcw, Send, Trash2, UploadCloud } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { Submission, SubmissionFile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const schema = z.object({ textContent: z.string().max(20_000, "Не больше 20 000 символов"), externalUrl: z.union([z.literal(""), z.url("Введите полную ссылку, включая https://")]) });
type FormValues = z.infer<typeof schema>;
type UploadItem = SubmissionFile & { progress?: number; previewUrl?: string; error?: string; sourceFile?: File };

const maxClientFileSize = 25 * 1024 * 1024;
const allowedClientMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "video/mp4", "video/quicktime",
]);

export function AssignmentForm({ lessonId, enrollmentId, description, criteria = [], submissions, nextLessonHref, preview = false }: { lessonId: string; enrollmentId: string; description: string; criteria?: string[]; submissions: Submission[]; nextLessonHref?: string; preview?: boolean }) {
  const [latestState, setLatestState] = useState<Submission | undefined>(submissions[0]);
  const latest = latestState;
  const editable = !preview && (!latest || latest.status === "draft" || latest.status === "revision_requested");
  const existingDraft = latest?.status === "draft" ? latest : undefined;
  const [submissionId, setSubmissionId] = useState(existingDraft?.id ?? null);
  const [files, setFiles] = useState<UploadItem[]>(existingDraft?.submission_files ?? []);
  const [saving, setSaving] = useState(false); const [submitting, setSubmitting] = useState(false); const [uploading, setUploading] = useState(false); const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());
  const storageKey = `ai-builder-draft:${lessonId}`;
  const defaults = { textContent: existingDraft?.text_content ?? (latest?.status === "revision_requested" ? latest.text_content : ""), externalUrl: existingDraft?.external_url ?? (latest?.status === "revision_requested" ? latest.external_url ?? "" : "") };
  const { register, getValues, reset, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  useEffect(() => {
    if (!preview && !existingDraft) { const local = window.localStorage.getItem(storageKey); if (local) { try { reset(schema.parse(JSON.parse(local))); } catch { /* ignore invalid local data */ } } }
    // React Hook Form intentionally exposes an imperative subscription API here.
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = watch((value) => { if (editable) window.localStorage.setItem(storageKey, JSON.stringify(value)); });
    return () => subscription.unsubscribe();
  }, [editable, existingDraft, preview, reset, storageKey, watch]);

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
  }, []);

  function resizeTextarea(element: HTMLTextAreaElement) {
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 150), 420)}px`;
  }

  async function persist(action: "draft" | "submit", id = submissionId) {
    const values = schema.parse(getValues());
    const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, enrollmentId, submissionId: id, ...values, action }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setSubmissionId(result.submission.id);
    const nextSubmission = { ...result.submission, submission_files: files, submission_comments: result.submission.submission_comments ?? [] } as Submission;
    setLatestState(nextSubmission);
    return nextSubmission;
  }

  async function saveDraft(showToast = true) {
    setSaving(true);
    setFormError(null);
    try { const submission = await persist("draft"); if (showToast) toast.success("Черновик сохранён"); return submission; }
    catch (error) { const message = error instanceof Error ? error.message : "Не удалось сохранить"; setFormError(message); toast.error(message); return undefined; }
    finally { setSaving(false); }
  }

  function uploadFile(file: File, draftId: string, existingTempId?: string) {
    return new Promise<SubmissionFile>((resolve, reject) => {
      const tempId = existingTempId ?? `temp-${crypto.randomUUID()}`;
      if (existingTempId) setFiles((current) => current.map((item) => item.id === tempId ? { ...item, progress: 0, error: undefined } : item));
      else {
        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        if (previewUrl) previewUrls.current.add(previewUrl);
        setFiles((current) => [...current, { id: tempId, submission_id: draftId, storage_path: "", original_name: file.name, mime_type: file.type, file_size: file.size, progress: 0, sourceFile: file, previewUrl }]);
      }
      const form = new FormData(); form.set("submissionId", draftId); form.set("lessonId", lessonId); form.set("file", file);
      const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/submissions/files");
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) setFiles((current) => current.map((item) => item.id === tempId ? { ...item, progress: Math.round((event.loaded / event.total) * 100) } : item)); };
      xhr.onload = () => { try { const result = JSON.parse(xhr.responseText); if (xhr.status < 200 || xhr.status >= 300) throw new Error(result.error); setFiles((current) => current.map((item) => item.id === tempId ? { ...result.file, previewUrl: item.previewUrl } : item)); resolve(result.file); } catch (error) { const message = error instanceof Error ? error.message : "Ошибка загрузки"; setFiles((current) => current.map((item) => item.id === tempId ? { ...item, progress: undefined, error: message } : item)); reject(error); } };
      xhr.onerror = () => { const error = new Error("Сеть недоступна"); setFiles((current) => current.map((item) => item.id === tempId ? { ...item, progress: undefined, error: error.message } : item)); reject(error); };
      xhr.send(form);
    });
  }

  async function onFiles(selected: FileList | null) {
    if (!selected?.length) return;
    setFormError(null);
    setUploading(true);
    try {
      const draft = submissionId ? { id: submissionId } : await saveDraft(false);
      if (!draft) return;
      for (const file of Array.from(selected)) {
        if (!allowedClientMimeTypes.has(file.type)) { toast.error(`${file.name}: формат не поддерживается`); continue; }
        if (file.size <= 0 || file.size > maxClientFileSize) { toast.error(`${file.name}: файл должен быть не больше 25 МБ`); continue; }
        try { await uploadFile(file, draft.id); } catch (error) { toast.error(`${file.name}: ${error instanceof Error ? error.message : "ошибка загрузки"}`); }
      }
    } finally { setUploading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function retryFile(file: UploadItem) {
    if (!file.sourceFile || !submissionId) return;
    setUploading(true);
    try { await uploadFile(file.sourceFile, submissionId, file.id); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось повторить загрузку"); }
    finally { setUploading(false); }
  }

  async function removeFile(file: UploadItem) {
    if (file.id.startsWith("temp-")) {
      if (file.previewUrl) { URL.revokeObjectURL(file.previewUrl); previewUrls.current.delete(file.previewUrl); }
      setFiles((current) => current.filter((item) => item.id !== file.id));
      return;
    }
    const response = await fetch(`/api/submissions/files?fileId=${file.id}`, { method: "DELETE" });
    if (response.ok) { setFiles((current) => current.filter((item) => item.id !== file.id)); toast.success("Файл удалён"); }
    else toast.error("Не удалось удалить файл");
  }

  async function submitWork() {
    setSubmitting(true);
    setFormError(null);
    try { const draft = submissionId ? { id: submissionId } : await saveDraft(false); if (!draft) return; await persist("submit", draft.id); window.localStorage.removeItem(storageKey); setConfirming(false); toast.success("Работа отправлена"); }
    catch (error) { const message = error instanceof Error ? error.message : "Не удалось отправить"; setFormError(message); toast.error(message); }
    finally { setSubmitting(false); }
  }

  const history = useMemo(() => {
    const merged = latest ? [latest, ...submissions.filter((item) => item.id !== latest.id)] : submissions;
    return merged.filter((item) => item.status !== "draft");
  }, [latest, submissions]);
  const failedUploads = files.some((file) => Boolean(file.error));
  const textRegistration = register("textContent");
  return <div className="space-y-6">
    <section className="premium-panel overflow-hidden"><div className="border-b border-[var(--border)] p-5 sm:p-6"><p className="eyebrow">Финальный штрих</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em]">Покажи, что получилось</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p></div>
      {latest && !editable ? <div className="p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Работа отправлена {formatDate(latest.submitted_at)}</p><p className="mt-1 text-xs text-[var(--muted)]">Попытка {latest.attempt_number}</p></div><StatusPill status={latest.status} /></div>{latest.status === "approved" && <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[var(--success)]/[.08] p-4 text-sm text-[#8be8c2]"><CheckCircle2 className="size-5" /> Работа принята. Новая отправка откроется только если преподаватель запросит доработку.</div>}{nextLessonHref && latest.status === "submitted" && <ButtonLink href={nextLessonHref} className="mt-5 w-full">Перейти к следующей миссии <ArrowRight className="size-4" /></ButtonLink>}</div> : <div className="p-5 sm:p-6">
        {preview && <div className="mb-5 rounded-2xl border border-[#8877ff]/20 bg-[#8877ff]/[.07] p-4 text-xs leading-5 text-[#c6c0ff]">Так выглядит задание ученика. В предпросмотре ввод, загрузка и отправка отключены.</div>}
        {latest?.status === "revision_requested" && <div className="mb-5 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[.07] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#ff98a9]"><MessageSquare className="size-4" /> Нужна доработка</div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Исправьте работу по комментарию ниже и отправьте новую попытку.</p></div>}
        {criteria.length > 0 && <div className="mb-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><p className="text-xs font-semibold">Готово, если:</p><ul className="mt-3 space-y-2">{criteria.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />{item}</li>)}</ul></div>}
        <div><label htmlFor="assignment-text" className="text-sm font-semibold">Расскажи, что ты создал</label><textarea id="assignment-text" {...textRegistration} ref={(element) => { textRegistration.ref(element); if (element) resizeTextarea(element); }} onInput={(event) => resizeTextarea(event.currentTarget)} disabled={preview} rows={6} placeholder="Опиши результат, решения и то, с чем столкнулся…" className="focus-ring mt-2 min-h-[150px] w-full resize-none rounded-2xl border border-[var(--border)] bg-black/15 px-4 py-3 text-base leading-6 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-[#666b78] hover:border-white/[.15] focus:border-[#7667ff]/45 focus:bg-black/20 disabled:opacity-60" />{errors.textContent && <p className="mt-1 text-xs text-[var(--danger)]">{errors.textContent.message}</p>}</div>
        <div className="mt-4"><label htmlFor="assignment-url" className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4" /> Публичная ссылка</label><input id="assignment-url" {...register("externalUrl")} disabled={preview} placeholder="https://…" className="focus-ring mt-2 h-12 w-full rounded-2xl border border-[var(--border)] bg-black/15 px-4 text-sm outline-none transition-[border-color,background-color,box-shadow] placeholder:text-[#666b78] hover:border-white/[.15] focus:border-[#7667ff]/45 focus:bg-black/20 disabled:opacity-60" />{errors.externalUrl && <p className="mt-1 text-xs text-[var(--danger)]">{errors.externalUrl.message}</p>}</div>
        <div className="mt-5"><input ref={fileInput} type="file" disabled={preview} multiple accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,video/mp4,video/quicktime" className="hidden" onChange={(event) => void onFiles(event.target.files)} /><button type="button" onClick={() => fileInput.current?.click()} disabled={uploading || preview} className="focus-ring flex min-h-28 w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-white/[.15] bg-white/[.02] text-sm font-semibold transition-[background-color,border-color,transform] hover:border-[#7667ff]/35 hover:bg-[#7667ff]/[.045] active:scale-[.99] disabled:opacity-60"><UploadCloud className="mb-2 size-5 text-[#aaa1ff]" />{uploading ? "Загружаем…" : "Добавить файлы"}<span className="mt-1 text-[10px] font-normal text-[var(--muted)]">Изображения, PDF, DOCX или короткое видео · до 25 МБ</span></button></div>
        {files.length > 0 && <div className="mt-3 grid gap-2" aria-live="polite">{files.map((file) => <div key={file.id} className={`flex items-center gap-3 rounded-xl border p-3 ${file.error ? "border-[var(--danger)]/20 bg-[var(--danger)]/[.045]" : "border-transparent bg-white/[.035]"}`}>{file.previewUrl ? <Image src={file.previewUrl} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-lg object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/[.05]">{file.mime_type.startsWith("image/") ? <ImageIcon className="size-4" /> : <File className="size-4" />}</span>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{file.original_name}</p><p className={`mt-1 text-[10px] ${file.error ? "text-[#ff98a9]" : "text-[var(--muted)]"}`}>{file.error ?? (file.progress !== undefined ? `${file.progress}%` : `${(file.file_size / 1024 / 1024).toFixed(1)} МБ`)}</p>{file.progress !== undefined && <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[.06]"><span className="block h-full bg-[var(--accent)]" style={{ width: `${file.progress}%` }} /></span>}</div>{file.error && <button type="button" onClick={() => void retryFile(file)} disabled={uploading} className="focus-ring grid size-9 place-items-center rounded-lg text-[#ffb2be] hover:bg-white/[.06]" aria-label={`Повторить загрузку ${file.original_name}`}><RotateCcw className="size-4" /></button>}<button type="button" onClick={() => void removeFile(file)} disabled={file.progress !== undefined} className="focus-ring grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]" aria-label={`Удалить ${file.original_name}`}><Trash2 className="size-4" /></button></div>)}</div>}
        {formError && <p role="alert" className="mt-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/[.06] px-4 py-3 text-xs leading-5 text-[#ff9aab]">{formError} Проверьте соединение и попробуйте ещё раз.</p>}
        <div className="mt-6 grid gap-2 sm:grid-cols-[auto_1fr]"><Button variant="secondary" loading={saving} disabled={preview || submitting || uploading || confirming} onClick={() => void saveDraft()}><Paperclip className="size-4" /> Сохранить черновик</Button>{confirming ? <div className="grid grid-cols-2 gap-2"><Button variant="ghost" disabled={submitting} onClick={() => setConfirming(false)}>Отмена</Button><Button loading={submitting} disabled={uploading || failedUploads || preview || saving} onClick={() => void submitWork()}><Send className="size-4" /> Да, отправить</Button></div> : <Button disabled={uploading || failedUploads || preview || saving || submitting} onClick={() => setConfirming(true)}><Send className="size-4" /> {latest?.status === "revision_requested" ? "Отправить повторно" : "Отправить работу"}</Button>}</div>
      </div>}
    </section>

    {history.length > 0 && <section><h3 className="mb-3 text-sm font-semibold">История отправок</h3><div className="grid gap-3">{history.map((item) => <article key={item.id} className="card p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold">Попытка {item.attempt_number}</p><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(item.submitted_at)}</p></div><StatusPill status={item.status} /></div>{item.text_content && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#c7cad3]">{item.text_content}</p>}{item.external_url && <a href={item.external_url} target="_blank" rel="noreferrer" className="mt-3 block truncate text-xs font-semibold text-[#9f96ff] underline underline-offset-4">{item.external_url}</a>}{(item.submission_files?.length ?? 0) > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.submission_files?.map((file) => <a key={file.id} href={file.signed_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/[.05] px-3 py-2 text-xs"><Paperclip className="size-3" />{file.original_name}</a>)}</div>}{(item.submission_comments?.length ?? 0) > 0 && <div className="mt-4 space-y-2">{item.submission_comments?.map((comment) => <div key={comment.id} className="rounded-xl border border-[#6d5dfc]/15 bg-[#6d5dfc]/[.06] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#a89eff]">Комментарий преподавателя</p><p className="mt-2 text-sm leading-6 text-[#d5d3e9]">{comment.comment}</p><p className="mt-2 text-[10px] text-[var(--muted)]">{formatDate(comment.created_at)}</p></div>)}</div>}</article>)}</div></section>}
  </div>;
}
