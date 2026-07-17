"use client";

import { useState } from "react";
import { Check, MessageSquare, Play, RotateCcw, UnlockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

export function ReviewControls({ submissionId, status }: { submissionId: string; status: string }) {
  const router = useRouter(); const [comment, setComment] = useState(""); const [busy, setBusy] = useState<string | null>(null); const [optimisticStatus, setOptimisticStatus] = useState(status);
  async function action(name: "start_review" | "approve" | "revision" | "comment" | "open_next") {
    if (name === "revision" && !comment.trim()) return toast.error("Напишите, что нужно доработать");
    if (name === "approve" && !window.confirm("Принять работу? Правило урока может открыть следующий шаг.")) return;
    setBusy(name);
    const previousStatus = optimisticStatus;
    const nextStatus = name === "start_review" ? "in_review" : name === "approve" ? "approved" : name === "revision" ? "revision_requested" : optimisticStatus;
    setOptimisticStatus(nextStatus);
    try { const response = await fetch(`/api/admin/submissions/${submissionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, comment: comment.trim() || undefined }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); toast.success(name === "approve" ? "Работа принята" : name === "revision" ? "Работа возвращена" : name === "comment" ? "Комментарий добавлен" : name === "open_next" ? "Следующий урок открыт" : "Проверка начата"); setComment(""); router.refresh(); }
    catch (error) { setOptimisticStatus(previousStatus); toast.error(error instanceof Error ? error.message : "Ошибка"); }
    finally { setBusy(null); }
  }
  return <div className="mt-5 border-t border-[var(--border)] pt-5"><div className="flex items-center justify-between gap-3"><label className="text-xs font-semibold">Комментарий преподавателя</label><StatusPill status={optimisticStatus as "submitted" | "in_review" | "revision_requested" | "approved"} /></div><textarea value={comment} onChange={(event) => setComment(event.target.value)} disabled={busy !== null} rows={3} placeholder="Что получилось хорошо или что нужно улучшить…" className="focus-ring mt-2 w-full rounded-xl border border-[var(--border)] bg-black/15 px-3 py-2.5 text-sm leading-6 disabled:opacity-60" /><div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{optimisticStatus === "submitted" && <Button variant="secondary" loading={busy === "start_review"} disabled={busy !== null} onClick={() => void action("start_review")} className="col-span-2 sm:col-auto"><Play className="size-4" /> Начать проверку</Button>}<Button loading={busy === "approve"} disabled={busy !== null || optimisticStatus === "approved"} onClick={() => void action("approve")} className="px-3"><Check className="size-4" /> Принять</Button><Button variant="danger" loading={busy === "revision"} disabled={busy !== null || optimisticStatus === "revision_requested"} onClick={() => void action("revision")} className="px-3"><RotateCcw className="size-4" /> На доработку</Button><Button variant="secondary" loading={busy === "comment"} disabled={busy !== null || !comment.trim()} onClick={() => void action("comment")} className="px-3"><MessageSquare className="size-4" /> Комментарий</Button><Button variant="ghost" loading={busy === "open_next"} disabled={busy !== null} onClick={() => void action("open_next")} className="px-3"><UnlockKeyhole className="size-4" /> Открыть следующий</Button></div></div>;
}
