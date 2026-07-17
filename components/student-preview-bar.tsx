"use client";

import { ArrowLeft, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function StudentPreviewBar() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function returnToAdmin() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось вернуться в админку");
      setBusy(false);
    }
  }

  return <aside className="student-shell sticky top-[env(safe-area-inset-top)] z-40 mb-2 rounded-2xl border border-[#8877ff]/25 bg-[#171528]/95 p-2.5 shadow-[0_12px_35px_rgba(0,0,0,.34)] backdrop-blur-xl" aria-label="Режим предпросмотра">
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-[#c6c0ff]"><Eye className="size-4 shrink-0" /><span className="truncate">Предпросмотр ученика · только чтение</span></span>
      <button type="button" onClick={() => void returnToAdmin()} disabled={busy} className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/[.08] px-3 text-xs font-semibold transition hover:bg-white/[.12] disabled:opacity-60"><ArrowLeft className="size-3.5" />{busy ? "Возвращаем…" : "В админку"}</button>
    </div>
  </aside>;
}
