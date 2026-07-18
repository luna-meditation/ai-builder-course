"use client";

import { useState, useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";
import { BookOpen, Home, LoaderCircle, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [{ href: "/course", label: "Курс", icon: Home }, { href: "/course#lessons", label: "Уроки", icon: BookOpen }, { href: "/profile", label: "Профиль", icon: UserRound }];

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function currentHash() {
  return window.location.hash;
}

export function BottomNav() {
  const pathname = usePathname();
  const hash = useSyncExternalStore(subscribeToHash, currentHash, () => "");
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  function active(href: string) {
    const target = pendingTarget ?? href;
    if (pendingTarget) return target === href;
    if (href === "/profile") return pathname === "/profile";
    if (href === "/course#lessons") return pathname === "/course" && hash === "#lessons";
    return pathname.startsWith("/course") && !(pathname === "/course" && hash === "#lessons");
  }

  function beginNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (pendingTarget === href) {
      event.preventDefault();
      return;
    }
    setPendingTarget(href);
    if (href.includes("#")) window.requestAnimationFrame(() => setPendingTarget(null));
  }

  return <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-3 pt-4 md:hidden">
    <div className="glass pointer-events-auto mx-auto grid max-w-sm grid-cols-3 rounded-[22px] border-white/[.11] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.46)]">{items.map((item) => { const Icon = item.icon; const isActive = active(item.href); const loading = pendingTarget === item.href; return <Link key={item.label} href={item.href} prefetch={false} onClick={(event) => beginNavigation(event, item.href)} aria-current={isActive ? "page" : undefined} aria-disabled={loading} className={cn("focus-ring relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition-[background-color,color,transform] duration-200 active:scale-95", isActive ? "bg-white/[.085] text-[#bbb4ff] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]" : "text-[var(--muted)] hover:text-white")}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className={cn("size-4 transition-transform duration-200", isActive && "-translate-y-0.5")} />}{item.label}{isActive && <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-[#8877ff] shadow-[0_0_8px_#8877ff]" />}
    </Link>; })}</div>
  </nav>;
}
