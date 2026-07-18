import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, Gauge, Gift, ListChecks, Route, Sparkles, Target } from "lucide-react";
import { AssignmentForm } from "@/components/assignment-form";
import { LessonMaterial, LessonPrompts, VideoPlayer } from "@/components/lesson-blocks";
import { LessonStageNav } from "@/components/lesson-stage-nav";
import { LessonVisit } from "@/components/lesson-visit";
import { StudentRoutePrefetch } from "@/components/student-route-prefetch";
import { StudentPreviewBar } from "@/components/student-preview-bar";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getStudentMode } from "@/lib/auth/access";
import { requireSession } from "@/lib/auth/session";
import { getLessonData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ courseSlug: string; lessonSlug: string }> }) {
  const { courseSlug, lessonSlug } = await params;
  const session = await requireSession();
  const data = await getLessonData(session, courseSlug, lessonSlug);
  const currentIndex = data.allLessons.findIndex((item) => item.id === data.lesson.id);
  const previous = data.allLessons[currentIndex - 1];
  const next = data.allLessons[currentIndex + 1];
  const studentMode = getStudentMode(session);
  const preview = studentMode === "preview";
  const missionSteps = data.lesson.mission_steps?.length ? data.lesson.mission_steps : ["Посмотреть видео", "Пройти материал", "Использовать промпты", "Выполнить практику"];
  const lessonHrefs = [previous, next].filter((item) => item && item.status !== "locked").map((item) => `/course/${courseSlug}/lesson/${item!.slug}`);
  const nextAvailable = next && (preview || next.status !== "locked");

  return <main className="student-shell safe-top lesson-bottom-space">
    <StudentRoutePrefetch lessonHrefs={lessonHrefs} />
    <LessonVisit enrollmentId={data.enrollment.id} lessonId={data.lesson.id} disabled={preview || !data.shouldMarkStarted} />
    {studentMode && <StudentPreviewBar mode={studentMode} />}
    <header className="animate-in flex items-center justify-between py-4"><Link href="/course" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-sm text-[var(--muted)] transition hover:bg-white/[.05] hover:text-[var(--text)] active:scale-[.98]"><ArrowLeft className="size-4" /> К курсу</Link><StatusPill status={data.progress.status} /></header>

    <section className="premium-panel animate-in relative mt-3 overflow-hidden p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#7667ff]/20 blur-[65px] glow-breathe" />
      <div className="relative">
        <p className="eyebrow flex items-center gap-2"><Sparkles className="size-4" /> Миссия {String(data.lesson.lesson_order).padStart(2, "0")} · из {data.allLessons.length}</p>
        <h1 className="mt-4 max-w-3xl text-balance text-[clamp(36px,8vw,62px)] font-bold leading-[1.02] tracking-[-.055em]">{data.lesson.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">{data.lesson.short_description}</p>
        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[.08] bg-black/10 p-3.5"><Clock3 className="size-4 text-[#9f95ff]" /><span className="mt-3 block text-[9px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Время</span><strong className="mt-1 block text-sm">{data.lesson.duration_minutes} мин</strong></div>
          <div className="rounded-2xl border border-white/[.08] bg-black/10 p-3.5"><Gauge className="size-4 text-[#70b3ff]" /><span className="mt-3 block text-[9px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Сложность</span><strong className="mt-1 block text-sm">{data.lesson.difficulty}</strong></div>
          <div className="col-span-2 rounded-2xl border border-white/[.08] bg-black/10 p-3.5 sm:col-span-1"><Target className="size-4 text-[#68d9cb]" /><span className="mt-3 block text-[9px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Что будет создано</span><strong className="mt-1 block text-sm leading-5">{data.lesson.expected_result}</strong></div>
        </div>
      </div>
    </section>

    <LessonStageNav />

    <section id="video" className="scroll-mt-24 pt-7"><div className="mb-4"><p className="eyebrow">Этап 1</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em]">Посмотри вводное видео</h2></div><div className="overflow-hidden rounded-[26px] border border-white/[.1] bg-black/20 p-2 shadow-[0_24px_70px_rgba(0,0,0,.34)] sm:rounded-[30px] sm:p-3"><VideoPlayer type={data.lesson.video_type} url={data.lesson.video_url} /></div></section>

    <section className="mt-6 grid gap-3 sm:grid-cols-[1.05fr_.95fr]">
      <article className="premium-panel p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-2xl bg-[#4ed5a3]/10 text-[#68ddb0]"><Gift className="size-5" /></span><p className="eyebrow mt-4">Что ты создашь</p><h2 className="mt-2 text-xl font-bold tracking-[-.025em]">Конкретный результат миссии</h2><p className="mt-3 text-sm leading-6 text-[#cdd0dc]">{data.lesson.expected_result}</p></article>
      <article className="card p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-2xl bg-[#7667ff]/12 text-[#aaa1ff]"><ListChecks className="size-5" /></span><p className="eyebrow mt-4">План миссии</p><ol className="mt-3 space-y-3">{missionSteps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6 text-[#cdd0dc]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/[.06] text-[9px] font-bold text-[#aaa1ff]">{index + 1}</span>{step}</li>)}</ol></article>
    </section>

    <section id="material" className="mt-12 scroll-mt-24"><div className="mb-6"><p className="eyebrow">Этап 2</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Материал миссии</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Иди сверху вниз: каждый блок подготавливает следующий шаг.</p></div><LessonMaterial blocks={data.blocks} /></section>

    <section id="prompts" className="mt-12 scroll-mt-24"><div className="mb-6"><p className="eyebrow">Этап 3</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Промпты этой миссии</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Все рабочие запросы собраны здесь в правильном порядке.</p></div><LessonPrompts lessonId={data.lesson.id} blocks={data.blocks} /></section>

    {data.lesson.assignment_required && <section id="practice" className="mt-12 scroll-mt-24"><div className="mb-6"><p className="eyebrow">Этап 4</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Практическое задание</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Собери результат, проверь критерии и отправь работу преподавателю.</p></div><AssignmentForm lessonId={data.lesson.id} enrollmentId={data.enrollment.id} description={data.lesson.assignment_description} criteria={data.lesson.assignment_criteria ?? []} submissions={data.submissions} nextLessonHref={next && data.lesson.unlock_rule === "after_submission" ? `/course/${courseSlug}/lesson/${next.slug}` : undefined} preview={preview} /></section>}

    <section className="premium-panel mt-12 p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#49d6a2]/10 text-[#68ddb0]"><Check className="size-5" /></span><div><p className="eyebrow">Завершение</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em]">Ты собрал результат этой миссии</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{next ? `Следующий шаг — миссия «${next.title}». Она откроется согласно правилу проверки задания.` : "Это финальная миссия. После отправки результата откроется итог курса."}</p></div></div><ButtonLink href={nextAvailable ? `/course/${courseSlug}/lesson/${next.slug}` : "/course"} className="mt-5 w-full">{nextAvailable ? "Продолжить создание" : "Вернуться к маршруту"}<ArrowRight className="size-4" /></ButtonLink></section>

    <nav className="mt-6 grid gap-2 sm:grid-cols-2">{previous ? <Link href={`/course/${courseSlug}/lesson/${previous.slug}`} className="card interactive-card focus-ring flex items-center gap-3 p-4 text-sm font-semibold"><ArrowLeft className="size-4 text-[var(--muted)]" /><span><span className="block text-[9px] font-normal uppercase tracking-[.13em] text-[var(--muted)]">Предыдущая миссия</span>{previous.title}</span></Link> : <span />}{next ? <Link href="/course" className="card interactive-card focus-ring flex items-center justify-between gap-3 p-4 text-right text-sm font-semibold"><span className="ml-auto"><span className="block text-[9px] font-normal uppercase tracking-[.13em] text-[var(--muted)]">Дальше</span>{next.title}</span><Route className="size-4 text-[var(--muted)]" /></Link> : <Link href="/course" className="card interactive-card focus-ring flex items-center justify-end gap-3 p-4 text-sm font-semibold">К маршруту <ArrowRight className="size-4" /></Link>}</nav>
  </main>;
}
