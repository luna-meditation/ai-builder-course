"use client";

import Link from "next/link";
import { LogOut, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import type { StudentMode } from "@/lib/types";
import { initials } from "@/lib/utils";

export function AppHeader({ firstName, lastName, role, studentMode = null }: { firstName: string; lastName?: string | null; role: string; studentMode?: StudentMode | null }) {
  const router = useRouter();
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/"); router.refresh(); }
  return <header className="student-shell safe-top relative z-30 flex items-center justify-between py-4">
    <Link href="/course" aria-label="На главную" className="focus-ring rounded-xl"><Logo /></Link>
    <div className="glass flex items-center gap-1 rounded-2xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,.24)]">
      {role === "admin" && !studentMode && <Link href="/admin" className="focus-ring grid size-9 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-white/[.07] hover:text-white" title="Админ-панель"><Shield className="size-4" /></Link>}
      <Link href="/profile" className="focus-ring flex h-9 items-center gap-2 rounded-xl bg-white/[.075] px-1.5 pr-3 text-xs font-bold transition hover:bg-white/[.11]" title="Профиль"><span className="grid size-6 place-items-center rounded-lg bg-[linear-gradient(135deg,#8979ff,#5379ee)] text-[9px] text-white">{initials(firstName, lastName)}</span><span className="hidden max-w-20 truncate sm:block">{firstName}</span></Link>
      <span className="hidden items-center gap-1 rounded-lg px-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#b9b1ff] md:flex"><Sparkles className="size-3" /> build</span>
      <button onClick={logout} className="focus-ring grid size-9 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-white/[.06] hover:text-white active:scale-95" title="Выйти"><LogOut className="size-4" /></button>
    </div>
  </header>;
}
