import { Activity, CheckCircle2, ClipboardList, GraduationCap, RotateCcw, TrendingUp, UsersRound } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStudentModes } from "@/components/admin/admin-student-modes";
import { requireSession } from "@/lib/auth/session";
import { getAdminDashboard } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const session = await requireSession("admin"); const data = await getAdminDashboard(session);
  const stats = [
    { label: "Все ученики", value: data.students, icon: UsersRound, tone: "text-[#a89eff] bg-[#6d5dfc]/12" },
    { label: "Активные", value: data.active, icon: Activity, tone: "text-[#84adff] bg-[#5f8cff]/12" },
    { label: "Завершили", value: data.completed, icon: GraduationCap, tone: "text-[var(--success)] bg-[var(--success)]/10" },
    { label: "На проверке", value: data.review, icon: ClipboardList, tone: "text-[var(--warning)] bg-[var(--warning)]/10" },
    { label: "На доработке", value: data.revision, icon: RotateCcw, tone: "text-[var(--danger)] bg-[var(--danger)]/10" },
    { label: "Средний прогресс", value: `${data.averageProgress}%`, icon: TrendingUp, tone: "text-[#69d7d0] bg-[#69d7d0]/10" },
  ];
  return <><AdminHeader eyebrow="Панель управления" title="Сегодня в AI BUILDER" description="Реальные показатели курса и очередь действий — без демонстрационных метрик в production." /><AdminStudentModes /><section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{stats.map(({ label, value, icon: Icon, tone }) => <article key={label} className="card p-4"><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-4" /></span><strong className="mt-5 block text-2xl">{value}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{label}</span></article>)}</section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Воронка курса</p><p className="mt-1 text-xs text-[var(--muted)]">Сводка активного набора</p></div><span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[10px] text-[var(--muted)]">LIVE DATA</span></div><div className="mt-7 space-y-5">{[{ label: "Получили доступ", value: data.active + data.completed, max: Math.max(1, data.students) }, { label: "Активно обучаются", value: data.active, max: Math.max(1, data.students) }, { label: "Завершили курс", value: data.completed, max: Math.max(1, data.students) }].map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-xs"><span className="text-[var(--muted)]">{item.label}</span><strong>{item.value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-gradient-to-r from-[#6d5dfc] to-[#6f9dff]" style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} /></div></div>)}</div></div>
      <div className="card p-5 sm:p-6"><p className="text-sm font-semibold">Последние действия</p><div className="mt-5 space-y-4">{data.audit.length ? data.audit.map((item: Record<string, unknown>) => { const profile = item.profiles as { first_name?: string } | null; return <div key={String(item.id)} className="flex gap-3"><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-white/[.05]"><CheckCircle2 className="size-3 text-[#a89eff]" /></span><div className="min-w-0"><p className="truncate text-xs font-medium">{profile?.first_name ?? "Система"}: {String(item.action).replaceAll("_", " ")}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{formatDate(String(item.created_at))}</p></div></div>; }) : <div className="py-8 text-center"><ClipboardList className="mx-auto size-6 text-[var(--muted)]" /><p className="mt-3 text-xs text-[var(--muted)]">Действий пока нет</p></div>}</div></div></section>
  </>;
}
