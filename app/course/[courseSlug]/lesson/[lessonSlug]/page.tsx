import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Gauge, Gift, Layers3, Route, Sparkles, Target } from "lucide-react";
import { AssignmentForm } from "@/components/assignment-form";
import { LessonBlocks, VideoPlayer } from "@/components/lesson-blocks";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { requireSession } from "@/lib/auth/session";
import { getLessonData } from "@/lib/data";

export const dynamic = "force-dynamic";

const lessonMeta = [
  { duration: "25 мин", difficulty: "Старт", product: "Идея будущего продукта" },
  { duration: "35 мин", difficulty: "Легко", product: "Первый опубликованный сайт" },
  { duration: "45 мин", difficulty: "Средне", product: "Рабочий Telegram Mini App" },
  { duration: "50 мин", difficulty: "Средне", product: "Своя игра с механикой" },
  { duration: "30 мин", difficulty: "Финал", product: "План запуска и развития" },
];

export default async function LessonPage({ params }: { params: Promise<{ courseSlug: string; lessonSlug: string }> }) {
  const { courseSlug, lessonSlug } = await params;
  const session = await requireSession();
  const data = await getLessonData(session, courseSlug, lessonSlug);
  const currentIndex = data.allLessons.findIndex((item) => item.id === data.lesson.id);
  const previous = data.allLessons[currentIndex - 1];
  const next = data.allLessons[currentIndex + 1];
  const meta = lessonMeta[currentIndex] ?? lessonMeta[0]!;

  return <main className="student-shell safe-top pb-16">
    <header className="animate-in flex items-center justify-between py-4"><Link href="/course" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-sm text-[var(--muted)] transition hover:bg-white/[.05] hover:text-[var(--text)] active:scale-[.98]"><ArrowLeft className="size-4" /> К курсу</Link><StatusPill status={data.progress.status} /></header>

    <section className="premium-panel animate-in relative mt-3 overflow-hidden p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#7667ff]/20 blur-[65px] glow-breathe" />
      <div className="relative">
        <p className="eyebrow flex items-center gap-2"><Sparkles className="size-4" /> Миссия {String(data.lesson.lesson_order).padStart(2, "0")} · из {data.allLessons.length}</p>
        <h1 className="mt-4 max-w-3xl text-balance text-[clamp(36px,8vw,62px)] font-bold leading-[1.02] tracking-[-.055em]">{data.lesson.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">{data.lesson.short_description}</p>

        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[.08] bg-black/10 p-3.5"><Clock3 className="size-4 text-[#9f95ff]" /><span className="mt-3 block text-[9px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Время</span><strong className="mt-1 block text-sm">{meta.duration}</strong></div>
          <div className="rounded-2xl border border-white/[.08] bg-black/10 p-3.5"><Gauge className="size-4 text-[#70b3ff]" /><span className="mt-3 block text-[9px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Сложность</span><strong className="mt-1 block text-sm">{meta.difficulty}</strong></div>
          <div className="col-span-2 rounded-2xl border border-white/[.08] bg-black/10 p-3.5 sm:col-span-1"><Layers3 className="size-4 text-[#68d9cb]" /><span className="mt-3 block text-[9px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Что создадим</span><strong className="mt-1 block text-sm">{meta.product}</strong></div>
        </div>

        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#7667ff]/20 bg-[#7667ff]/[.07] p-4"><Target className="mt-0.5 size-5 shrink-0 text-[#b3aaff]" /><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#b3aaff]">Что получится в итоге</p><p className="mt-2 text-sm leading-6 text-[#d0d2dd]">{data.lesson.expected_result}</p></div></div>
      </div>
    </section>

    <section className="animate-in-delay mt-5 overflow-hidden rounded-[26px] border border-white/[.1] bg-black/20 p-2 shadow-[0_24px_70px_rgba(0,0,0,.34)] sm:rounded-[30px] sm:p-3"><VideoPlayer type={data.lesson.video_type} url={data.lesson.video_url} /></section>

    <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Результаты урока">
      <article className="card p-4 sm:p-5"><span className="grid size-10 place-items-center rounded-2xl bg-[#7667ff]/12 text-[#aaa1ff]"><CheckCircle2 className="size-5" /></span><h2 className="mt-4 text-sm font-semibold">Что мы сделали</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Разобрали миссию и собрали её основу шаг за шагом.</p></article>
      <article className="card p-4 sm:p-5"><span className="grid size-10 place-items-center rounded-2xl bg-[#4ed5a3]/10 text-[#68ddb0]"><Gift className="size-5" /></span><h2 className="mt-4 text-sm font-semibold">Что ты получил</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{data.lesson.expected_result}</p></article>
      <article className="card p-4 sm:p-5"><span className="grid size-10 place-items-center rounded-2xl bg-[#4b91f5]/10 text-[#78adff]"><Route className="size-5" /></span><h2 className="mt-4 text-sm font-semibold">Следующий шаг</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{next ? `Подготовиться к миссии «${next.title}».` : "Зафиксировать результат и перейти к завершению курса."}</p></article>
    </section>

    <div className="mt-5"><ButtonLink href="#lesson-work" className="group w-full min-h-14 text-base">Продолжить создание <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" /></ButtonLink></div>

    <section id="lesson-work" className="mt-12 scroll-mt-6"><div className="mb-6"><p className="eyebrow">Практический маршрут</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Собираем результат</h2></div><LessonBlocks lessonId={data.lesson.id} blocks={data.blocks} /></section>
    {data.lesson.assignment_required && <section className="mt-12"><AssignmentForm lessonId={data.lesson.id} enrollmentId={data.enrollment.id} description={data.lesson.assignment_description} submissions={data.submissions} /></section>}

    <nav className="mt-10 grid gap-2 sm:grid-cols-2">{previous ? <Link href={`/course/${courseSlug}/lesson/${previous.slug}`} className="card interactive-card focus-ring flex items-center gap-3 p-4 text-sm font-semibold"><ArrowLeft className="size-4 text-[var(--muted)]" /><span><span className="block text-[9px] font-normal uppercase tracking-[.13em] text-[var(--muted)]">Предыдущая миссия</span>{previous.title}</span></Link> : <span />}{next ? <Link href="/course" className="card interactive-card focus-ring flex items-center justify-between gap-3 p-4 text-right text-sm font-semibold"><span className="ml-auto"><span className="block text-[9px] font-normal uppercase tracking-[.13em] text-[var(--muted)]">Следующая миссия</span>{next.title}</span><ArrowRight className="size-4 text-[var(--muted)]" /></Link> : <Link href="/course" className="card interactive-card focus-ring flex items-center justify-end gap-3 p-4 text-sm font-semibold">Вернуться к маршруту <ArrowRight className="size-4" /></Link>}</nav>
  </main>;
}
