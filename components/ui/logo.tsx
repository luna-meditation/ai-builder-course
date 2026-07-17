import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <div className={cn("flex items-center gap-3", className)}>
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[var(--accent)] text-white shadow-[0_10px_28px_rgba(109,93,252,.32)]">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(255,255,255,.5),transparent_50%)]" />
      <Sparkles className="relative size-5" strokeWidth={2.2} />
    </span>
    {!compact && <span className="leading-none"><span className="block text-sm font-extrabold tracking-[.13em]">AI BUILDER</span><span className="mt-1 block text-[10px] font-medium tracking-wide text-[var(--muted)]">BUILD WHAT MATTERS</span></span>}
  </div>;
}
