"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

async function track(lessonId: string, title: string) {
  await fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "prompt_copied", properties: { lessonId, title } }) }).catch(() => undefined);
}

export function PromptCard({ lessonId, title, description, text }: { lessonId: string; title: string; description?: string; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(text); setCopied(true); void track(lessonId, title); window.setTimeout(() => setCopied(false), 1800); }
  return <div className="overflow-hidden rounded-[26px] border border-[#7667ff]/22 bg-[radial-gradient(circle_at_90%_0%,rgba(118,103,255,.13),transparent_32%),rgba(118,103,255,.045)] shadow-[inset_0_1px_0_rgba(255,255,255,.035)]"><div className="flex items-start justify-between gap-3 border-b border-[#7667ff]/13 px-4 py-4 sm:px-5"><div><p className="text-sm font-semibold">{title}</p>{description && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>}</div><button onClick={copy} className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/[.07] bg-white/[.065] px-3 py-2 text-[10px] font-semibold transition hover:bg-white/[.1] active:scale-95">{copied ? <><Check className="size-3.5 text-[var(--success)]" /> <span className="hidden sm:inline">Скопировано</span></> : <><Copy className="size-3.5" /> <span className="hidden sm:inline">Копировать</span></>}</button></div><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[12px] leading-6 text-[#dad8f3]">{text}</pre></div>;
}

export function CopyAllPrompts({ lessonId, prompts }: { lessonId: string; prompts: Array<{ title: string; text: string }> }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(prompts.map((prompt) => `${prompt.title}\n\n${prompt.text}`).join("\n\n———\n\n")); setCopied(true); void track(lessonId, "all"); window.setTimeout(() => setCopied(false), 1800); }
  return <button onClick={copy} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.04] px-4 py-2.5 text-xs font-semibold transition hover:border-white/[.15] hover:bg-white/[.07] active:scale-[.98]">{copied ? <Check className="size-4 text-[var(--success)]" /> : <Copy className="size-4" />}{copied ? "Все промпты скопированы" : "Скопировать все промпты"}</button>;
}
