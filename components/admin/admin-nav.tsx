"use client";

import Link from "next/link";
import { BookOpenText, ClipboardCheck, Eye, LayoutDashboard, LoaderCircle, LogOut, Settings, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Обзор", icon: LayoutDashboard },
  { href: "/admin/students", label: "Ученики", icon: UsersRound },
  { href: "/admin/submissions", label: "Задания", icon: ClipboardCheck },
  { href: "/admin/course", label: "Редактор курса", icon: BookOpenText },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function AdminNav({ firstName }: { firstName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    for (const link of links) router.prefetch(link.href);
  }, [router]);

  function isActive(href: string) {
    const current = pendingPath && pendingPath !== pathname ? pendingPath : pathname;
    return href === "/admin" ? current === href : current.startsWith(href);
  }

  function startNavigation(href: string) {
    if (href !== pathname) setPendingPath(href);
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/"); router.refresh(); }
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[#0d0f14]/95 p-5 backdrop-blur-xl lg:block">
      <Logo />
      <nav className="mt-10 space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch onClick={() => startNavigation(href)} className={cn("focus-ring relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition", isActive(href) ? "bg-[#6d5dfc]/14 text-[#b8b1ff]" : "text-[var(--muted)] hover:bg-white/[.04] hover:text-white")}><Icon className="size-4" />{label}{pendingPath === href && pendingPath !== pathname && <LoaderCircle className="ml-auto size-3.5 animate-spin" />}</Link>)}</nav>
      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Администратор</p><p className="mt-1 text-sm font-semibold">{firstName}</p>
        <Link href="/admin#student-modes" className="focus-ring mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#a89eff]"><Eye className="size-3" /> Проверить как ученик</Link>
        <button type="button" onClick={() => void logout()} className="focus-ring mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-white"><LogOut className="size-3" /> Выйти</button>
      </div>
    </aside>
    <header className="safe-top mx-auto flex max-w-[1440px] items-center justify-between px-4 pt-2 lg:hidden"><Logo /><Link href="/admin#student-modes" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.035] px-3 text-xs font-semibold text-[#b8b1ff]"><Eye className="size-3.5" /> Режимы</Link></header>
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border)] bg-[#0b0c11]/94 px-2 pt-2 backdrop-blur-xl lg:hidden">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch onClick={() => startNavigation(href)} className={cn("focus-ring relative flex min-w-0 flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold", isActive(href) ? "text-[#b8b1ff]" : "text-[var(--muted)]")}><Icon className="size-4" /><span className="max-w-full truncate">{label === "Редактор курса" ? "Курс" : label}</span>{pendingPath === href && pendingPath !== pathname && <span className="absolute top-0.5 size-1.5 animate-pulse rounded-full bg-[#8877ff]" />}</Link>)}</nav>
  </>;
}
