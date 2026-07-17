"use client";

import Link from "next/link";
import { BookOpenText, ClipboardCheck, ExternalLink, LayoutDashboard, LogOut, Settings, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/"); router.refresh(); }
  return <><aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[#0d0f14]/95 p-5 backdrop-blur-xl lg:block"><Logo /><nav className="mt-10 space-y-1">{links.map(({ href, label, icon: Icon }) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={cn("focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition", active ? "bg-[#6d5dfc]/14 text-[#b8b1ff]" : "text-[var(--muted)] hover:bg-white/[.04] hover:text-white")}><Icon className="size-4" />{label}</Link>; })}</nav><div className="absolute inset-x-5 bottom-5 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Администратор</p><p className="mt-1 text-sm font-semibold">{firstName}</p><Link href="/course" className="mt-3 inline-flex items-center gap-1 text-xs text-[#a89eff]">Открыть как пользователь <ExternalLink className="size-3" /></Link><button onClick={logout} className="focus-ring mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-white"><LogOut className="size-3" /> Выйти и сменить роль</button></div></aside><nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[var(--border)] bg-[#0b0c11]/94 px-2 pt-2 backdrop-blur-xl lg:hidden">{links.map(({ href, label, icon: Icon }) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={cn("focus-ring flex flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold", active ? "text-[#b8b1ff]" : "text-[var(--muted)]")}><Icon className="size-4" />{label === "Редактор курса" ? "Курс" : label}</Link>; })}<button onClick={logout} className="focus-ring flex flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold text-[var(--muted)]"><LogOut className="size-4" />Сменить</button></nav></>;
}
