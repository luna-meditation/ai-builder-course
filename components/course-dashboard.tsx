import Link from "next/link";
import { ArrowRight, Bot, Check, Flag, Gamepad2, Globe2, Lightbulb, LockKeyhole, Play, Rocket, Sparkles, Trophy } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { StudentPreviewBar } from "@/components/student-preview-bar";
import { StudentRoutePrefetch } from "@/components/student-route-prefetch";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { CourseDashboard as DashboardType, ProgressStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const missionMeta = [
  { icon: Lightbulb, label: "Замысел", color: "#a997ff", glow: "rgba(118,103,255,.18)" },
  { icon: Globe2, label: "Сайт", color: "#76acff", glow: "rgba(63,126,255,.17)" },
  { icon: Bot, label: "Mini App", color: "#65d9d1", glow: "rgba(69,207,193,.15)" },
  { icon: Gamepad2, label: "Игра", color: "#e39bff", glow: "rgba(205,99,255,.14)" },
  { icon: Rocket, label: "Запуск", color: "#ffb86f", glow: "rgba(245,168,77,.14)" },
];

function lockedReason(previousStatus?: ProgressStatus) {
  if (previousStatus === "submitted" || previousStatus === "in_review") return "Предыдущая работа ожидает проверки";
  if (previousStatus === "revision_requested") return "Доработай предыдущее задание";
  return "Заверши предыдущую миссию, чтобы открыть эту";
}

export function CourseDashboard({ data, preview = false }: { data: DashboardType; preview?: boolean }) {
  const current = data.lessons.find((lesson) => lesson.progress?.status && !["locked", "completed"].includes(lesson.progress.status)) ?? data.lessons.find((lesson) => lesson.progress?.status === "available");
  const remaining = Math.max(0, data.lessons.length - data.completedCount);
  const ringOffset = 100 - data.percent;

  return <>
    <StudentRoutePrefetch lessonHrefs={current ? [`/course/${data.course.slug}/lesson/${current.slug}`] : []} />
    <AppHeader firstName={data.profile.first_name} lastName={data.profile.last_name} role={data.profile.role} />
    {preview && <StudentPreviewBar />}
    <main className="student-shell pb-32 pt-4 md:pb-16">
      <section className="premium-panel animate-in relative overflow-hidden p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#7465f6]/20 blur-[60px] glow-breathe" />
        <div className="pointer-events-none absolute bottom-0 left-[35%] h-24 w-72 rounded-full bg-[#318bea]/10 blur-[55px]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <p className="eyebrow flex items-center gap-2"><Sparkles className="size-4" /> Твоя сборка</p>
            <span className="rounded-full border border-white/[.08] bg-black/15 px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)]">5 миссий · 3 продукта</span>
          </div>
          <h1 className="mt-5 max-w-xl text-balance text-[clamp(32px,7vw,48px)] font-bold leading-[1.04] tracking-[-.05em]">Ты не просто учишься.<br /><span className="text-gradient">Ты создаёшь продукт.</span></h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">{data.course.description}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {data.enrollment.status === "completed" ? <ButtonLink href="/complete" className="group"><Trophy className="size-4" /> Посмотреть итог <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></ButtonLink> : current ? <ButtonLink href={`/course/${data.course.slug}/lesson/${current.slug}`} className="group"><Play className="size-4 fill-current" /> Продолжить создание <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></ButtonLink> : null}
            <span className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[.08] bg-black/10 px-4 text-xs text-[var(--muted)]"><Check className="size-4 text-[var(--success)]" /> {data.completedCount} {data.completedCount === 1 ? "миссия уже готова" : data.completedCount > 1 && data.completedCount < 5 ? "миссии уже готовы" : "миссий уже готовы"}</span>
          </div>
        </div>
      </section>

      <section className="premium-panel animate-in-delay mt-4 overflow-hidden p-5 sm:p-7" aria-label="Прогресс курса">
        <div className="grid items-center gap-6 sm:grid-cols-[160px_1fr] sm:gap-8">
          <div className="relative mx-auto size-36">
            <svg className="progress-ring size-full drop-shadow-[0_0_18px_rgba(118,103,255,.22)]" viewBox="0 0 120 120" role="img" aria-label={`${data.percent}% курса завершено`}>
              <circle cx="60" cy="60" r="51" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="9" />
              <circle className="progress-value" cx="60" cy="60" r="51" fill="none" stroke="url(#course-progress)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={ringOffset} />
              <defs><linearGradient id="course-progress"><stop stopColor="#9b8cff" /><stop offset=".58" stopColor="#6f75f4" /><stop offset="1" stopColor="#67d8cf" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center"><span><strong className="block text-3xl tracking-[-.04em]">{data.percent}%</strong><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[var(--muted)]">готово</span></span></div>
          </div>

          <div>
            <p className="eyebrow">Прогресс создания</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-.035em]">{data.completedCount} из {data.lessons.length} миссий завершено</h2>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-3.5"><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--muted)]">Следующий этап</span><strong className="mt-1.5 block truncate text-sm">{current?.title ?? "Курс завершён"}</strong></div>
              <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-3.5"><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--muted)]">Осталось</span><strong className="mt-1.5 block text-sm">{remaining} {remaining === 1 ? "миссия" : remaining > 1 && remaining < 5 ? "миссии" : "миссий"}</strong></div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.055]"><span className="progress-fill block h-full rounded-full bg-[linear-gradient(90deg,#7b6bf7,#6994f5,#67d8cf)] shadow-[0_0_14px_rgba(118,103,255,.45)]" style={{ width: `${data.percent}%` }} /></div>
          </div>
        </div>
      </section>

      <section id="lessons" className="mt-11 scroll-mt-4">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow flex items-center gap-2"><Flag className="size-4" /> Программа курса</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Пять миссий до запуска</h2></div><span className="hidden text-xs text-[var(--muted)] sm:block">Сложность растёт вместе с тобой</span></div>
        <div className="relative grid gap-3.5 before:absolute before:bottom-8 before:left-[27px] before:top-8 before:w-px before:bg-gradient-to-b before:from-[#7667ff]/35 before:via-white/[.08] before:to-transparent sm:before:left-[31px]">
          {data.lessons.map((lesson, index) => {
            const status = lesson.progress?.status ?? "locked";
            const completed = status === "completed";
            const locked = status === "locked";
            const active = !completed && !locked;
            const previous = data.lessons[index - 1]?.progress?.status;
            const meta = missionMeta[index] ?? missionMeta[missionMeta.length - 1]!;
            const Icon = meta.icon;
            const content = <div className="relative flex items-start gap-3.5 sm:gap-5">
              <span className={cn("relative z-10 grid size-[54px] shrink-0 place-items-center rounded-[18px] border transition-transform duration-300 sm:size-[62px] sm:rounded-[20px]", completed && "border-[#4ed5a3]/20 bg-[#4ed5a3]/10 text-[#69dfb0]", active && "current-pulse border-[#8877ff]/30 bg-[#7667ff]/15", locked && "border-white/[.06] bg-[#0d0f15] text-[var(--muted)]")} style={active ? { color: meta.color, boxShadow: `0 12px 32px ${meta.glow}` } : undefined}>{completed ? <Check className="size-5 sm:size-6" strokeWidth={2.5} /> : locked ? <LockKeyhole className="size-4 sm:size-5" /> : <Icon className="size-5 sm:size-6" />}</span>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Миссия {String(lesson.lesson_order).padStart(2, "0")} · {meta.label}</span>{active && <span className="rounded-full bg-[#7667ff]/13 px-2 py-1 text-[9px] font-bold uppercase tracking-[.11em] text-[#b9b1ff]">Текущая</span>}</div>
                <h3 className="mt-1.5 pr-1 text-base font-semibold leading-6 tracking-[-.015em] sm:text-lg">{lesson.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{lesson.short_description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2"><StatusPill status={status} />{locked && <span className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]"><LockKeyhole className="size-3" /> {lockedReason(previous)}</span>}</div>
              </div>
              {!locked && <ArrowRight className="mt-5 size-5 shrink-0 text-[var(--muted)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />}
            </div>;

            return locked && !preview
              ? <div key={lesson.id} className="card p-4 opacity-65 sm:p-5">{content}</div>
              : <Link key={lesson.id} href={`/course/${data.course.slug}/lesson/${lesson.slug}`} prefetch={false} className={cn("card interactive-card group focus-ring block p-4 sm:p-5", locked && "opacity-65")} aria-label={locked && preview ? `${lesson.title}. Заблокировано для ученика, доступно в предпросмотре` : undefined}>{content}</Link>;
          })}
        </div>
      </section>
    </main>
    <BottomNav />
  </>;
}
