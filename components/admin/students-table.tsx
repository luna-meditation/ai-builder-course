"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Check, KeyRound, Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Enrollment, Profile } from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

interface Row { profile: Profile; enrollment: Enrollment | null; progressPercent: number; currentLesson: number }

export function StudentsTable({ rows, courseId }: { rows: Row[]; courseId?: string }) {
  const router = useRouter(); const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const [busy, setBusy] = useState<string | null>(null);
  const filtered = useMemo(() => rows.filter(({ profile, enrollment }) => { const haystack = `${profile.first_name} ${profile.last_name ?? ""} ${profile.username ?? ""}`.toLowerCase(); const matchesQuery = haystack.includes(query.toLowerCase()); const state = !enrollment ? "no_access" : enrollment.status; return matchesQuery && (filter === "all" || filter === state); }), [filter, query, rows]);

  async function access(row: Row, action: "grant" | "revoke") {
    if (!courseId) return toast.error("Сначала опубликуйте курс");
    if (action === "revoke" && !window.confirm(`Отозвать доступ у ${row.profile.first_name}?`)) return;
    setBusy(row.profile.id);
    try { const response = await fetch("/api/admin/enrollments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: row.profile.id, courseId, action }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); toast.success(action === "grant" ? "Доступ выдан" : "Доступ отозван"); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Ошибка"); }
    finally { setBusy(null); }
  }
  async function toggleBlock(row: Row) {
    if (!row.profile.is_blocked && !window.confirm(`Заблокировать ${row.profile.first_name}? Пользователь потеряет доступ.`)) return;
    setBusy(row.profile.id);
    try { const response = await fetch(`/api/admin/profiles/${row.profile.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: !row.profile.is_blocked }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); toast.success(row.profile.is_blocked ? "Пользователь разблокирован" : "Пользователь заблокирован"); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Ошибка"); }
    finally { setBusy(null); }
  }
  return <><div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя или @username" className="focus-ring h-11 w-full rounded-xl border border-[var(--border)] bg-black/10 pl-10 pr-4 text-sm" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="focus-ring h-11 rounded-xl border border-[var(--border)] bg-[#15171e] px-3 text-sm"><option value="all">Все ученики</option><option value="active">С доступом</option><option value="completed">Завершили</option><option value="revoked">Доступ отозван</option><option value="no_access">Без доступа</option></select></div>
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left"><thead><tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wide text-[var(--muted)]"><th className="px-5 py-4 font-semibold">Ученик</th><th className="px-4 py-4 font-semibold">Доступ</th><th className="px-4 py-4 font-semibold">Текущий урок</th><th className="px-4 py-4 font-semibold">Прогресс</th><th className="px-4 py-4 font-semibold">Последняя активность</th><th className="px-5 py-4 text-right font-semibold">Действия</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.profile.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[.015]"><td className="px-5 py-4"><Link href={`/admin/students/${row.profile.id}`} className="focus-ring flex items-center gap-3 rounded-lg"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.06] text-xs font-bold">{initials(row.profile.first_name, row.profile.last_name)}</span><span><strong className="block text-sm">{row.profile.first_name} {row.profile.last_name}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{row.profile.username ? `@${row.profile.username}` : String(row.profile.telegram_user_id)}</span></span></Link></td><td className="px-4 py-4"><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold", row.profile.is_blocked ? "bg-[var(--danger)]/10 text-[var(--danger)]" : row.enrollment?.status === "active" ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-white/[.05] text-[var(--muted)]")}>{row.profile.is_blocked ? <Ban className="size-3" /> : row.enrollment?.status === "active" ? <Check className="size-3" /> : <X className="size-3" />}{row.profile.is_blocked ? "Заблокирован" : row.enrollment?.status === "active" ? "Активен" : row.enrollment?.status === "completed" ? "Завершил" : "Нет доступа"}</span></td><td className="px-4 py-4 text-sm">{row.enrollment ? `${row.currentLesson} / 5` : "—"}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[.06]"><span className="block h-full bg-[var(--accent)]" style={{ width: `${row.progressPercent}%` }} /></span><span className="text-xs font-semibold">{row.progressPercent}%</span></div></td><td className="px-4 py-4 text-xs text-[var(--muted)]">{formatDate(row.profile.last_seen_at)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{row.enrollment?.status === "active" ? <Button variant="ghost" loading={busy === row.profile.id} onClick={() => void access(row, "revoke")} className="min-h-9 px-3">Отозвать</Button> : <Button variant="secondary" loading={busy === row.profile.id} onClick={() => void access(row, "grant")} className="min-h-9 px-3"><KeyRound className="size-3.5" /> Выдать</Button>}<Button variant="ghost" onClick={() => void toggleBlock(row)} disabled={busy === row.profile.id} className="min-h-9 px-3" title={row.profile.is_blocked ? "Разблокировать" : "Заблокировать"}><Ban className="size-3.5" /></Button></div></td></tr>)}</tbody></table>{!filtered.length && <div className="py-14 text-center"><UserRound className="mx-auto size-7 text-[var(--muted)]" /><p className="mt-3 text-sm text-[var(--muted)]">Ученики не найдены</p></div>}</div></div></>;
}
