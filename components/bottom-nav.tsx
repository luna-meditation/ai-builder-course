"use client";

import Link from "next/link";
import { BookOpen, Home, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [{ href: "/course", label: "Курс", icon: Home }, { href: "/course#lessons", label: "Уроки", icon: BookOpen }, { href: "/profile", label: "Профиль", icon: UserRound }];

export function BottomNav() {
  const pathname = usePathname();
  return <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-3 pt-4 md:hidden">
    <div className="glass pointer-events-auto mx-auto grid max-w-sm grid-cols-3 rounded-[22px] border-white/[.11] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.46)]">{items.map((item) => { const Icon = item.icon; const baseHref = item.href.split("#", 1)[0] ?? item.href; const active = item.href === "/course" ? pathname === "/course" : pathname.startsWith(baseHref); return <Link key={item.label} href={item.href} className={cn("focus-ring relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition-[background-color,color,transform] duration-300 active:scale-95", active ? "bg-white/[.085] text-[#bbb4ff] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]" : "text-[var(--muted)] hover:text-white")}><Icon className={cn("size-4 transition-transform duration-300", active && "-translate-y-0.5")} />{item.label}{active && <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-[#8877ff] shadow-[0_0_8px_#8877ff]" />}</Link>; })}</div>
  </nav>;
}
