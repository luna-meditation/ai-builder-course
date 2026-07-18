"use client";

import { useState } from "react";
import { CheckCircle2, LogOut, MessageCircle, RefreshCw, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import type { AccessStatus } from "@/lib/types";

export function NoAccess({
  firstName,
  supportUsername,
  accessStatus,
  justRegistered = false,
}: {
  firstName: string;
  supportUsername: string;
  accessStatus: AccessStatus;
  justRegistered?: boolean;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const blocked = accessStatus === "blocked";
  const revoked = accessStatus === "revoked";
  const title = justRegistered
    ? "Вы успешно зарегистрированы"
    : blocked
      ? `${firstName}, профиль заблокирован`
      : revoked
        ? `${firstName}, доступ приостановлен`
        : `${firstName}, у вас пока нет доступа`;
  const description = justRegistered
    ? "Доступ к курсу пока не открыт. Профиль уже появился у администратора — можно запросить доступ или проверить его позже."
    : blocked
      ? "Обратитесь в поддержку, чтобы уточнить причину блокировки и восстановить доступ."
      : revoked
        ? "Администратор отозвал доступ к курсу. Напишите в поддержку, если считаете, что это произошло по ошибке."
        : "Доступ к курсу выдаётся администратором вручную. Напишите в поддержку или проверьте статус ещё раз.";

  async function checkAccess() {
    if (checking) return;
    setChecking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/access/status", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.hasAccess) {
        setMessage("Доступ открыт. Загружаем курс…");
        router.replace(result.destination ?? "/course");
        return;
      }
      setMessage(result.accessStatus === "revoked" ? "Доступ пока приостановлен." : result.accessStatus === "blocked" ? "Профиль пока заблокирован." : "Доступ ещё не открыт. Попробуйте позже.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить доступ. Попробуйте ещё раз.");
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  return <main className="grid min-h-screen place-items-center px-5 py-12"><div className="card relative w-full max-w-lg overflow-hidden p-7 text-center sm:p-10"><div className="absolute -right-20 -top-24 size-64 rounded-full bg-[#6d5dfc]/15 blur-3xl" /><Logo className="relative justify-center" /><div className="relative mx-auto mt-10 grid size-16 place-items-center rounded-2xl bg-white/[.05] text-[#a89eff]">{justRegistered ? <CheckCircle2 className="size-7 text-[var(--success)]" /> : blocked || revoked ? <ShieldX className="size-7" /> : <MessageCircle className="size-7" />}</div><h1 className="relative mt-6 text-3xl font-bold tracking-tight">{title}</h1><p className="relative mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>{message && <p className="relative mt-4 rounded-2xl border border-white/[.08] bg-white/[.035] px-4 py-3 text-xs leading-5 text-[#cfd1dc]" aria-live="polite">{message}</p>}<div className="relative mt-7 grid gap-2 sm:grid-cols-2"><a href={`https://t.me/${supportUsername.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold"><MessageCircle className="size-4" /> {justRegistered ? "Получить доступ" : "Написать в поддержку"}</a><Button variant="secondary" loading={checking} disabled={checking} onClick={() => void checkAccess()}><RefreshCw className="size-4" /> Проверить доступ</Button><Button variant="ghost" onClick={() => void logout()} className="sm:col-span-2"><LogOut className="size-4" /> Выйти</Button></div></div></main>;
}
