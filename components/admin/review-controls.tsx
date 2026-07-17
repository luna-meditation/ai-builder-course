"use client";

import { useState } from "react";
import { Check, MessageSquare, Play, RotateCcw, UnlockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReviewControls({ submissionId, status }: { submissionId: string; status: string }) {
  const router = useRouter(); const [comment, setComment] = useState(""); const [busy, setBusy] = useState<string | null>(null);
  async function action(name: "start_review" | "approve" | "revision" | "comment" | "open_next") {
    if (name === "revision" && !comment.trim()) return toast.error("Напишите, что нужно доработать");
    if (name === "approve" && !window.confirm("Принять работу? Правило урока может открыть следующий шаг.")) return;
    setBusy(name);
    try { const response = await fetch(`/api/admin/submissions/${submissionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, comment: comment.trim() || undefined }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); toast.success(name === "approve" ? "Работа принята" : name === "revision" ? "Работа возвращена" : name === "comment" ? "Комментарий добавлен" : name === "open_next" ? "Следующий урок открыт" : "Проверка начата"); setComment(""); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Ошибка"); }
    finally { setBusy(null); }
  }
  return <div className="mt-5 border-t border-[var(--border)] pt-5"><label className="text-xs font-semibold">Комментарий преподавателя</label><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Что получилось хорошо или что нужно улучшить…" className="focus-ring mt-2 w-full rounded-xl border border-[var(--border)] bg-black/15 px-3 py-2.5 text-sm leading-6" /><div className="mt-3 flex flex-wrap gap-2">{status === "submitted" && <Button variant="secondary" loading={busy === "start_review"} onClick={() => void action("start_review")}><Play className="size-4" /> Начать проверку</Button>}<Button loading={busy === "approve"} onClick={() => void action("approve")}><Check className="size-4" /> Принять</Button><Button variant="danger" loading={busy === "revision"} onClick={() => void action("revision")}><RotateCcw className="size-4" /> На доработку</Button><Button variant="secondary" loading={busy === "comment"} disabled={!comment.trim()} onClick={() => void action("comment")}><MessageSquare className="size-4" /> Комментарий</Button><Button variant="ghost" loading={busy === "open_next"} onClick={() => void action("open_next")}><UnlockKeyhole className="size-4" /> Открыть следующий</Button></div></div>;
}
