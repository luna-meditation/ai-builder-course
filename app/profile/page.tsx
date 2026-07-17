import { CalendarDays, CheckCircle2, CircleUserRound, FileCheck2, Flame, FolderKanban, Rocket, Sparkles, Star, Trophy } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { NoAccess } from "@/components/no-access";
import { StudentPreviewBar } from "@/components/student-preview-bar";
import { requireSession } from "@/lib/auth/session";
import { getProfileData } from "@/lib/data";
import { formatDate, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

function currentLevel(percent: number) {
  if (percent >= 100) return "Создатель";
  if (percent >= 60) return "Инноватор";
  if (percent >= 20) return "Исследователь";
  return "Новичок";
}

export default async function ProfilePage() {
  const session = await requireSession();
  const result = await getProfileData(session);
  if (!result.access) return <NoAccess firstName={result.profile.first_name} supportUsername={result.supportUsername} />;
  const { dashboard } = result;
  const projectsCreated = Math.min(3, dashboard.completedCount);
  const streakDays = dashboard.completedCount > 0 ? Math.min(7, dashboard.completedCount) : 0;
  const level = currentLevel(dashboard.percent);

  return <>
    <AppHeader firstName={dashboard.profile.first_name} lastName={dashboard.profile.last_name} role={dashboard.profile.role} />
    {session.previewAsStudent && <StudentPreviewBar />}
    <main className="student-shell pb-32 pt-4 md:pb-16">
      <section className="premium-panel animate-in relative overflow-hidden p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-[#7667ff]/22 blur-[70px] glow-breathe" />
        <div className="pointer-events-none absolute bottom-[-80px] left-[25%] size-52 rounded-full bg-[#2d85ef]/12 blur-[60px]" />
        <div className="relative flex flex-col items-center text-center sm:flex-row sm:text-left">
          <div className="relative"><div className="grid size-24 shrink-0 place-items-center rounded-[30px] border border-white/[.13] bg-[linear-gradient(145deg,#9385ff,#6655e9_55%,#397bdc)] text-2xl font-black shadow-[0_20px_50px_rgba(87,70,218,.38),inset_0_1px_0_rgba(255,255,255,.25)]">{initials(dashboard.profile.first_name, dashboard.profile.last_name)}</div><span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-xl border-4 border-[#12141b] bg-[#4ed5a3] text-[#07120d]"><CheckCircle2 className="size-4" strokeWidth={3} /></span></div>
          <div className="mt-5 min-w-0 sm:ml-6 sm:mt-0"><p className="eyebrow flex items-center justify-center gap-2 sm:justify-start"><Sparkles className="size-4" /> Профиль создателя</p><h1 className="mt-2 truncate text-3xl font-bold tracking-[-.04em] sm:text-4xl">{dashboard.profile.first_name} {dashboard.profile.last_name}</h1><p className="mt-1.5 text-sm text-[var(--muted)]">{dashboard.profile.username ? `@${dashboard.profile.username}` : "Ученик курса AI Builder"}</p><span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#4ed5a3]/15 bg-[#4ed5a3]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#68ddb0]"><span className="size-1.5 rounded-full bg-[#68ddb0] shadow-[0_0_8px_#68ddb0]" />{dashboard.enrollment.status === "completed" ? "Курс завершён" : "Активно создаёт"}</span></div>
          <div className="relative mt-7 size-28 shrink-0 sm:ml-auto sm:mt-0"><svg className="progress-ring size-full" viewBox="0 0 120 120" role="img" aria-label={`${dashboard.percent}% курса завершено`}><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" /><circle className="progress-value" cx="60" cy="60" r="50" fill="none" stroke="#8877ff" strokeWidth="8" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - dashboard.percent} /></svg><div className="absolute inset-0 grid place-items-center text-center"><span><strong className="block text-2xl">{dashboard.percent}%</strong><span className="text-[9px] uppercase tracking-wider text-[var(--muted)]">прогресс</span></span></div></div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: FolderKanban, value: String(projectsCreated), label: "проектов создано", color: "text-[#aaa1ff]", bg: "bg-[#7667ff]/12" },
          { icon: Flame, value: String(streakDays), label: "серия дней", color: "text-[#ffb16f]", bg: "bg-[#ef9347]/10" },
          { icon: Star, value: String(dashboard.completedCount), label: "завершено уроков", color: "text-[#68d9cb]", bg: "bg-[#4ed5c5]/10" },
          { icon: Rocket, value: level, label: "текущий уровень", color: "text-[#75aaff]", bg: "bg-[#4b91f5]/10" },
        ].map(({ icon: Icon, value, label, color, bg }) => <article key={label} className="card interactive-card p-4 sm:p-5"><span className={`grid size-10 place-items-center rounded-2xl ${bg} ${color}`}><Icon className="size-5" /></span><strong className="mt-4 block truncate text-xl tracking-[-.03em]">{value}</strong><span className="mt-1 block text-[10px] leading-4 text-[var(--muted)]">{label}</span></article>)}
      </section>

      <section className="premium-panel mt-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Твой рост</p><h2 className="mt-2 text-xl font-bold tracking-[-.025em]">Путь до уровня «Создатель»</h2></div><Trophy className="size-6 text-[#b0a7ff]" /></div>
        <div className="mt-5 flex justify-between text-xs"><span className="text-[var(--muted)]">{dashboard.completedCount} {dashboard.completedCount === 1 ? "миссия пройдена" : dashboard.completedCount > 1 && dashboard.completedCount < 5 ? "миссии пройдено" : "миссий пройдено"}</span><span className="font-semibold">{dashboard.lessons.length - dashboard.completedCount} осталось</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.055]"><span className="progress-fill block h-full rounded-full bg-[linear-gradient(90deg,#7667ff,#5e91f5,#65d9d1)] shadow-[0_0_16px_rgba(118,103,255,.38)]" style={{ width: `${dashboard.percent}%` }} /></div>
        <div className="mt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-[.12em] text-[var(--muted)]"><span>Новичок</span><span>Исследователь</span><span>Создатель</span></div>
      </section>

      <section className="card mt-4 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white/[.045] text-[#aaa1ff]"><CircleUserRound className="size-5" /></span><div><p className="eyebrow">Детали</p><h2 className="mt-1 font-semibold">Твоё обучение</h2></div></div><div className="mt-5 space-y-4"><div className="flex justify-between gap-4 border-b border-[var(--border)] pb-4 text-sm"><span className="text-[var(--muted)]">Курс</span><span className="text-right font-medium">{dashboard.course.title}</span></div><div className="flex justify-between gap-4 border-b border-[var(--border)] pb-4 text-sm"><span className="text-[var(--muted)]">Старт</span><span className="inline-flex items-center gap-1.5 font-medium"><CalendarDays className="size-4 text-[#aaa1ff]" />{formatDate(dashboard.enrollment.access_granted_at).split(",")[0]}</span></div><div className="flex justify-between gap-4 border-b border-[var(--border)] pb-4 text-sm"><span className="text-[var(--muted)]">Тариф</span><span className="font-medium">{dashboard.enrollment.plan}</span></div><div className="flex justify-between gap-4 text-sm"><span className="text-[var(--muted)]">Статус</span><span className="inline-flex items-center gap-1.5 font-medium"><FileCheck2 className="size-4 text-[var(--success)]" />{dashboard.enrollment.status === "completed" ? "Завершён" : "Активен"}</span></div></div></section>
    </main>
    <BottomNav />
  </>;
}
