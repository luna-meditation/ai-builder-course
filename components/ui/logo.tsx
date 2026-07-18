import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <div className={cn("flex items-center gap-3", className)}>
    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full shadow-[0_10px_30px_rgba(88,92,255,.3)]">
      <Image src="/brand/ai-builder-symbol.png" alt="" width={256} height={256} className="size-full object-cover" priority />
    </span>
    {!compact && <span className="leading-none"><span className="block text-sm font-extrabold tracking-[.13em]">AI BUILDER</span><span className="mt-1 block text-[10px] font-medium tracking-[.18em] text-[#7d89ff]">COURSE</span></span>}
  </div>;
}
