"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Gamepad2, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function AuthGate({ devMode }: { devMode: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [telegramAttempted, setTelegramAttempted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const webApp = window.Telegram?.WebApp;
      webApp?.ready(); webApp?.expand();
      if (webApp?.initData) {
        webApp.setHeaderColor?.("#090a0e"); webApp.setBackgroundColor?.("#090a0e");
        setLoading(true);
        try {
          const response = await fetch("/api/auth/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: webApp.initData }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          router.refresh();
        } catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось войти"); setLoading(false); }
      }
      setTelegramAttempted(true);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [router]);

  async function devLogin(role: "student" | "admin" | "no_access") {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/dev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось войти"); setLoading(false); }
  }

  return <main className="relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute left-[12%] top-24 size-[360px] rounded-full bg-[#7667ff]/20 blur-[110px] glow-breathe" />
    <div className="pointer-events-none absolute -right-32 top-[36%] size-[380px] rounded-full bg-[#3978ef]/15 blur-[120px]" />
    <div className="shell safe-top relative flex min-h-screen flex-col pb-10">
      <header className="animate-in flex items-center justify-between py-4"><Logo /><span className="glass rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#70e3ca] shadow-[0_0_10px_#70e3ca]" /> 5 миссий · практика</span></header>

      <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
        <div className="relative z-10">
          <div className="eyebrow animate-in mb-5 flex w-fit items-center gap-2"><Sparkles className="size-4" /> Твой путь в IT начинается здесь</div>
          <h1 className="animate-in animate-in-delay max-w-[720px] text-balance text-[clamp(42px,8vw,76px)] font-black leading-[.98] tracking-[-.06em]">Создай свой первый <span className="text-gradient">IT-продукт</span> с помощью ИИ.</h1>
          <p className="animate-in animate-in-delay mt-7 max-w-[610px] text-pretty text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">Без программирования. Без многолетнего обучения. Шаг за шагом ты создашь настоящий сайт, Telegram Mini App и игру.</p>

          <div className="animate-in animate-in-delay mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#c7c9d3]">
            {["Сразу на практике", "Понятный маршрут", "Реальный результат"].map((item) => <span key={item} className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-[#75dcc6]" />{item}</span>)}
          </div>

          <div className="animate-in animate-in-delay mt-9 max-w-xl">
            {loading ? <Button loading className="w-full sm:w-auto">Открываем курс</Button> : telegramAttempted && !devMode ? <div><div className="premium-panel max-w-lg p-5"><p className="font-semibold">Открой курс внутри Telegram</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Вход произойдёт автоматически через твой Telegram-профиль.</p></div></div> : null}
            {devMode && <div className="premium-panel p-4 sm:p-5"><Button onClick={() => devLogin("student")} disabled={loading} className="group w-full text-base sm:min-h-14"><Sparkles className="size-4" /> Начать создавать <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></Button><div className="mt-3 flex items-center justify-between gap-2 px-1"><span className="text-[10px] text-[var(--muted)]">DEV · тестовая роль</span><div className="flex gap-1"><button onClick={() => devLogin("admin")} disabled={loading} className="focus-ring rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted)] transition hover:bg-white/[.06] hover:text-white"><ShieldCheck className="mr-1 inline size-3" />Админ</button><button onClick={() => devLogin("no_access")} disabled={loading} className="focus-ring rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted)] transition hover:bg-white/[.06] hover:text-white">Без доступа</button></div></div></div>}
          </div>
        </div>

        <div className="relative mx-auto hidden h-[510px] w-full max-w-[430px] lg:block" aria-hidden>
          <div className="absolute inset-12 rounded-full bg-[#7566f8]/20 blur-[70px] glow-breathe" />
          <div className="float-slow premium-panel absolute left-0 top-32 z-20 w-[290px] rotate-[-4deg] p-5 shadow-[0_28px_80px_rgba(0,0,0,.5)]">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">Твой прогресс</span><Sparkles className="size-4 text-[#9b90ff]" /></div>
            <div className="mt-5 flex items-center gap-4"><div className="grid size-20 place-items-center rounded-full border-[7px] border-[#8172ff] border-r-white/[.08] text-lg font-bold shadow-[0_0_24px_rgba(118,103,255,.25)]">60%</div><div><strong className="text-xl">3 из 5</strong><p className="mt-1 text-xs text-[var(--muted)]">миссий завершено</p></div></div>
          </div>
          <div className="float-reverse premium-panel absolute -right-2 top-0 z-10 w-52 rotate-[5deg] p-4"><Globe2 className="size-5 text-[#77a5ff]" /><p className="mt-4 text-sm font-semibold">Сайт запущен</p><span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-white/[.06]"><span className="block h-full w-full rounded-full bg-gradient-to-r from-[#7062ed] to-[#69d5c8]" /></span></div>
          <div className="float-reverse premium-panel absolute bottom-20 left-14 z-30 w-60 rotate-[3deg] p-4"><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#7667ff]/15 text-[#b7afff]"><Bot className="size-5" /></span><div><p className="text-sm font-semibold">Mini App готов</p><p className="mt-1 text-[10px] text-[#73d7c1]">● Опубликован</p></div></div></div>
          <div className="float-slow premium-panel absolute bottom-2 right-2 z-20 w-48 rotate-[-5deg] p-4"><Gamepad2 className="size-5 text-[#e7a3ff]" /><p className="mt-3 text-sm font-semibold">Твоя первая игра</p><p className="mt-1 text-[10px] text-[var(--muted)]">Создана вместе с ИИ</p></div>
        </div>
      </section>
    </div>
  </main>;
}
