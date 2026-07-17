import Link from "next/link";
import { ArrowRight, Bot, Gamepad2, Globe2, MessageCircle, PartyPopper, Sparkles, TrendingUp } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getCompletionData } from "@/lib/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CompletePage() {
  const session = await requireSession();
  const result = await getCompletionData(session);
  if (!result) redirect("/course");
  const projectLessons = result.dashboard.lessons.slice(1);
  const cards = [
    { icon: Globe2, title: "Ваш сайт", lesson: projectLessons[0] },
    { icon: Bot, title: "Telegram Mini App", lesson: projectLessons[1] },
    { icon: Gamepad2, title: "Браузерная игра", lesson: projectLessons[2] },
    { icon: TrendingUp, title: "План монетизации", lesson: projectLessons[3] },
  ];
  const support = (result.dashboard.course.settings.support_username as string | undefined) ?? "ai_builder_support";
  return <main className="student-shell safe-top safe-bottom min-h-screen py-8"><section className="relative overflow-hidden rounded-[32px] border border-[#6d5dfc]/25 bg-[linear-gradient(145deg,rgba(109,93,252,.25),rgba(17,19,25,.96)_50%)] p-7 text-center sm:p-12"><div className="absolute left-1/2 top-0 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6d5dfc]/25 blur-3xl" /><div className="relative mx-auto grid size-20 place-items-center rounded-[26px] bg-[#6d5dfc] shadow-[0_20px_60px_rgba(109,93,252,.45)]"><PartyPopper className="size-9" /></div><p className="eyebrow relative mt-8">Маршрут завершён</p><h1 className="relative mx-auto mt-3 max-w-xl text-balance text-4xl font-black leading-tight tracking-[-.045em] sm:text-6xl">Вы это создали, {result.dashboard.profile.first_name}.</h1><p className="relative mx-auto mt-5 max-w-lg text-sm leading-7 text-[var(--muted)]">Вы не просто посмотрели уроки — вы собрали портфолио настоящих продуктов и план следующего шага.</p><div className="relative mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-[#b8b1ff]"><Sparkles className="size-4" /> 5 из 5 уроков · 100%</div></section>
    <section className="mt-8"><p className="eyebrow">Ваш результат</p><h2 className="mt-2 text-2xl font-bold">Четыре актива для следующего шага</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{cards.map(({ icon: Icon, title, lesson }, index) => { const submission = lesson ? result.latestByLesson.get(lesson.id) : undefined; return <article key={title} className="card p-5"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-[15px] bg-[#6d5dfc]/12 text-[#a89eff]"><Icon className="size-5" /></span><span className="text-xs font-bold text-[var(--success)]">ГОТОВО</span></div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{submission?.text_content || lesson?.expected_result}</p>{submission?.external_url && <a href={submission.external_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#a89eff]">Открыть проект <ArrowRight className="size-3.5" /></a>}{index === 3 && !submission?.external_url && <span className="mt-4 block text-xs text-[var(--muted)]">План сохранён в финальном задании</span>}</article>; })}</div></section>
    <div className="mt-8 grid gap-2 sm:grid-cols-2"><Link href="/course" className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold">Вернуться к материалам</Link><a href={`https://t.me/${support.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.04] px-4 text-sm font-semibold"><MessageCircle className="size-4" /> Связаться с авторами</a></div>
  </main>;
}
