"use client";

import { ArrowLeft, Eye, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { StudentMode } from "@/lib/types";

export function StudentPreviewBar({ mode }: { mode: StudentMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function returnToAdmin() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/student-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "admin" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось вернуться в админку");
      setBusy(false);
    }
  }

  const preview = mode === "preview";
  return <aside className={`student-shell sticky top-[env(safe-area-inset-top)] z-40 mb-2 rounded-2xl border p-2.5 shadow-[0_12px_35px_rgba(0,0,0,.34)] backdrop-blur-xl ${preview ? "border-[#8877ff]/25 bg-[#171528]/95" : "border-[#49d6a2]/20 bg-[#10201c]/95"}`} aria-label={preview ? "Режим предпросмотра" : "Учебный режим администратора"}>
    <div className="flex items-center justify-between gap-3">
      <span className={`flex min-w-0 items-center gap-2 text-xs font-semibold ${preview ? "text-[#c6c0ff]" : "text-[#83e5c3]"}`}>{preview ? <Eye className="size-4 shrink-0" /> : <GraduationCap className="size-4 shrink-0" />}<span className="min-w-0"><span className="block truncate">{preview ? "Предпросмотр · только чтение" : "Учебный режим администратора"}</span>{!preview && <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.12em] text-[#62cda8]">Действия сохраняются</span>}</span></span>
      <button type="button" onClick={() => void returnToAdmin()} disabled={busy} className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/[.08] px-3 text-xs font-semibold transition hover:bg-white/[.12] disabled:opacity-60"><ArrowLeft className="size-3.5" />{busy ? "Возвращаем…" : "В админку"}</button>
    </div>
  </aside>;
}
