"use client";

import { Eye, GraduationCap, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Mode = "preview" | "learning";

const modes = [
  {
    id: "preview" as const,
    icon: Eye,
    title: "Предпросмотр",
    description: "Только посмотреть интерфейс",
    detail: "Прогресс, задания и файлы не изменяются.",
    tone: "text-[#b8b1ff] bg-[#7667ff]/12",
  },
  {
    id: "learning" as const,
    icon: GraduationCap,
    title: "Учиться как ученик",
    description: "Проходить уроки и отправлять задания",
    detail: "Действия сохраняются в вашем личном enrollment.",
    tone: "text-[#72dfbd] bg-[#49d6a2]/10",
  },
];

export function AdminStudentModes() {
  const router = useRouter();
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(mode: Mode) {
    if (busy) return;
    setBusy(mode);
    setError(null);
    try {
      const response = await fetch("/api/auth/student-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace(result.destination ?? "/course");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось переключить режим");
      setBusy(null);
    }
  }

  return <section id="student-modes" className="premium-panel relative mb-6 overflow-hidden p-5 sm:p-6">
    <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[#7667ff]/16 blur-[65px]" />
    <div className="relative">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/[.05] text-[#aaa1ff]"><ShieldCheck className="size-5" /></span>
        <div><p className="eyebrow">Проверка продукта</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em]">Проверить ученическую часть</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Выберите, хотите вы только посмотреть интерфейс или пройти курс с сохранением результата.</p></div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {modes.map(({ id, icon: Icon, title, description, detail, tone }) => <button key={id} type="button" onClick={() => void enter(id)} disabled={Boolean(busy)} className={cn("card interactive-card focus-ring group min-h-36 p-5 text-left disabled:pointer-events-none disabled:opacity-60", busy === id && "border-[#8877ff]/35 bg-[#7667ff]/10")}>
          <span className={cn("grid size-10 place-items-center rounded-2xl", tone)}>{busy === id ? <LoaderCircle className="size-5 animate-spin" /> : <Icon className="size-5" />}</span>
          <strong className="mt-4 block text-base">{title}</strong>
          <span className="mt-1 block text-sm text-[#d5d7df]">{description}</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{detail}</span>
        </button>)}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/[.07] px-4 py-3 text-xs text-[#ff9aab]">{error} Попробуйте ещё раз.</p>}
    </div>
  </section>;
}
