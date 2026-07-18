"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const stages = [
  { id: "video", label: "Видео" },
  { id: "material", label: "Материал" },
  { id: "prompts", label: "Промпты" },
  { id: "practice", label: "Практика" },
];

export function LessonStageNav() {
  const [active, setActive] = useState("video");

  useEffect(() => {
    const elements = stages.map(({ id }) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-18% 0px -68%", threshold: [0, 0.2, 0.6] });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <nav className="sticky top-[max(8px,env(safe-area-inset-top))] z-30 mt-4 rounded-2xl border border-white/[.09] bg-[#0d0f15]/92 p-1.5 shadow-[0_14px_38px_rgba(0,0,0,.34)] backdrop-blur-xl" aria-label="Этапы урока">
    <ol className="grid grid-cols-4 gap-1">{stages.map((stage, index) => <li key={stage.id}><a href={`#${stage.id}`} onClick={() => setActive(stage.id)} aria-current={active === stage.id ? "step" : undefined} className={cn("focus-ring flex min-h-10 items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-semibold transition-[background-color,color,transform] active:scale-[.98] sm:text-xs", active === stage.id ? "bg-[#7667ff]/16 text-[#c5beff]" : "text-[var(--muted)] hover:text-white")}><span className={cn("grid size-4 place-items-center rounded-full text-[8px]", active === stage.id ? "bg-[#8877ff] text-white" : "bg-white/[.06]")}>{index + 1}</span><span className="truncate">{stage.label}</span></a></li>)}</ol>
  </nav>;
}
