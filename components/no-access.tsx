"use client";

import { LogOut, MessageCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function NoAccess({ firstName, supportUsername }: { firstName: string; supportUsername: string }) {
  const router = useRouter();
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/"); router.refresh(); }
  return <main className="grid min-h-screen place-items-center px-5 py-12"><div className="card relative w-full max-w-lg overflow-hidden p-7 text-center sm:p-10"><div className="absolute -right-20 -top-24 size-64 rounded-full bg-[#6d5dfc]/15 blur-3xl" /><Logo className="relative justify-center" /><div className="relative mx-auto mt-10 grid size-16 place-items-center rounded-2xl bg-white/[.05] text-[#a89eff]"><MessageCircle className="size-7" /></div><h1 className="relative mt-6 text-3xl font-bold tracking-tight">{firstName}, у вас пока нет доступа</h1><p className="relative mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">Доступ к курсу выдаётся администратором вручную. Если вы уже зарегистрировались, напишите в поддержку или проверьте ещё раз.</p><div className="relative mt-7 grid gap-2 sm:grid-cols-2"><a href={`https://t.me/${supportUsername.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold"><MessageCircle className="size-4" /> Написать в поддержку</a><Button variant="secondary" onClick={() => router.refresh()}><RefreshCw className="size-4" /> Проверить доступ</Button><Button variant="ghost" onClick={() => void logout()} className="sm:col-span-2"><LogOut className="size-4" /> Выйти</Button></div></div></main>;
}
