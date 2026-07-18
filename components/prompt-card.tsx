"use client";

import { Check, ChevronDown, ChevronUp, Copy, Layers3 } from "lucide-react";
import { useState } from "react";

async function track(lessonId: string, title: string) {
  await fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "prompt_copied", properties: { lessonId, title } }) }).catch(() => undefined);
}

function copyWithSelection(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto -9999px";
  textarea.style.fontSize = "16px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

export async function copyTextWithFallback(value: string) {
  // Keep the fallback synchronous while the tap still counts as a user gesture.
  // Telegram WebView can expose Clipboard API but leave writeText pending forever.
  if (window.Telegram?.WebApp.initData && copyWithSelection(value)) return;

  try {
    if (navigator.clipboard?.writeText) {
      await Promise.race([
        navigator.clipboard.writeText(value),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Clipboard timeout")), 800)),
      ]);
      return;
    }
  } catch {
    // Telegram and iOS WebViews can reject or stall the modern Clipboard API.
  }

  if (!copyWithSelection(value)) throw new Error("Не удалось скопировать");
}

export function PromptCard({ lessonId, title, description, tool, text, previewEnabled = true, previewLines = 6 }: { lessonId: string; title: string; description?: string; tool?: string; text: string; previewEnabled?: boolean; previewLines?: number }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [expanded, setExpanded] = useState(!previewEnabled);
  const normalizedLines = Math.min(8, Math.max(4, previewLines));

  async function copy() {
    try {
      await copyTextWithFallback(text);
      setCopyFailed(false);
      setCopied(true);
      void track(lessonId, title);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 2400);
    }
  }

  return <article className="overflow-hidden rounded-[26px] border border-[#7667ff]/22 bg-[radial-gradient(circle_at_90%_0%,rgba(118,103,255,.13),transparent_32%),rgba(118,103,255,.045)] shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
    <div className="flex items-start justify-between gap-3 border-b border-[#7667ff]/13 px-4 py-4 sm:px-5">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{title}</h3>{tool && <span className="rounded-full bg-white/[.055] px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#aaa1ff]">{tool}</span>}</div>{description && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>}</div>
      <button type="button" onClick={() => void copy()} aria-live="polite" className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/[.07] bg-white/[.065] px-3 py-2 text-[10px] font-semibold transition hover:bg-white/[.1] active:scale-95">{copied ? <><Check className="size-3.5 text-[var(--success)]" /> <span>Скопировано</span></> : <><Copy className="size-3.5" /> <span className="hidden sm:inline">{copyFailed ? "Не удалось" : "Скопировать"}</span></>}</button>
    </div>
    <div className="relative">
      <pre className="overflow-hidden whitespace-pre-wrap break-words px-5 py-5 font-mono text-[12px] leading-6 text-[#dad8f3] transition-[max-height] duration-300" style={{ maxHeight: expanded ? "none" : `${normalizedLines * 24 + 40}px` }}>{text}</pre>
      {!expanded && previewEnabled && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#151324] via-[#151324]/90 to-transparent" />}
    </div>
    {previewEnabled && <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 border-t border-[#7667ff]/13 text-xs font-semibold text-[#b8b1ff] transition hover:bg-white/[.035]">{expanded ? <><ChevronUp className="size-4" /> Свернуть</> : <><ChevronDown className="size-4" /> Показать полностью</>}</button>}
  </article>;
}

export function CopyAllPrompts({ lessonId, prompts }: { lessonId: string; prompts: Array<{ title: string; tool?: string; text: string }> }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  async function copy() {
    const combined = prompts.map((prompt, index) => {
      const heading = `${index + 1}. ${prompt.title}${prompt.tool ? ` · ${prompt.tool}` : ""}`;
      return `${heading}\n${"=".repeat(heading.length)}\n\n${prompt.text}`;
    }).join("\n\n———\n\n");
    try {
      await copyTextWithFallback(combined);
      setCopyFailed(false);
      setCopied(true);
      void track(lessonId, "all");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 2400);
    }
  }
  return <button type="button" onClick={() => void copy()} aria-live="polite" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.04] px-4 py-2.5 text-xs font-semibold transition hover:border-white/[.15] hover:bg-white/[.07] active:scale-[.98]">{copied ? <Check className="size-4 text-[var(--success)]" /> : <Layers3 className="size-4" />}{copied ? "Все промпты скопированы" : copyFailed ? "Не удалось скопировать" : "Скопировать все промпты"}</button>;
}
