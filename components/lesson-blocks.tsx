import { AlertCircle, Check, Download, ExternalLink, FileText, Lightbulb } from "lucide-react";
import { CopyAllPrompts, PromptCard } from "@/components/prompt-card";
import type { LessonBlock } from "@/lib/types";

function text(content: Record<string, unknown>, key: string) { return typeof content[key] === "string" ? content[key] : ""; }

export function VideoPlayer({ type, url }: { type: string | null; url: string | null }) {
  if (!url) return <div className="grid aspect-video place-items-center rounded-[20px] bg-[radial-gradient(circle_at_50%_20%,rgba(118,103,255,.12),transparent_48%),#0b0d12] p-8 text-center"><span><span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/[.08] bg-white/[.045]"><FileText className="size-5 text-[#aaa1ff]" /></span><strong className="mt-4 block text-sm">Видео добавит автор курса</strong><span className="mt-1 block text-xs text-[var(--muted)]">Материалы и задание уже доступны ниже</span></span></div>;
  if (type === "youtube") {
    const id = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{6,})/)?.[1];
    if (id) return <div className="aspect-video overflow-hidden rounded-[20px]"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="Видео урока" className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>;
  }
  if (type === "vimeo") {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    if (id) return <div className="aspect-video overflow-hidden rounded-[20px]"><iframe src={`https://player.vimeo.com/video/${id}`} title="Видео урока" className="size-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>;
  }
  if (type === "mp4") return <video src={url} controls playsInline preload="metadata" className="aspect-video w-full rounded-[20px] bg-black" />;
  return <a href={url} target="_blank" rel="noreferrer" className="card focus-ring flex items-center justify-between p-5 font-semibold"><span>Открыть видео урока</span><ExternalLink className="size-4" /></a>;
}

export function LessonBlocks({ lessonId, blocks }: { lessonId: string; blocks: LessonBlock[] }) {
  const prompts = blocks.filter((block) => block.block_type === "prompt").map((block) => ({ title: text(block.content, "title"), text: text(block.content, "text") }));
  return <div className="space-y-6">
    {prompts.length > 1 && <div className="flex justify-end"><CopyAllPrompts lessonId={lessonId} prompts={prompts} /></div>}
    {blocks.map((block) => {
      if (block.block_type === "heading") return <h2 key={block.id} className="pt-4 text-2xl font-bold tracking-[-.035em] sm:text-3xl">{text(block.content, "text")}</h2>;
      if (block.block_type === "paragraph") return <p key={block.id} className="text-[15px] leading-7 text-[#c7cad3]">{text(block.content, "text")}</p>;
      if (block.block_type === "divider") return <hr key={block.id} className="border-[var(--border)]" />;
      if (block.block_type === "callout") { const warning = block.content.tone === "warning"; return <div key={block.id} className={`rounded-[24px] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] ${warning ? "border-[var(--warning)]/20 bg-[linear-gradient(140deg,rgba(244,180,95,.09),rgba(244,180,95,.025))]" : "border-[#7667ff]/20 bg-[linear-gradient(140deg,rgba(118,103,255,.1),rgba(118,103,255,.025))]"}`}><div className="flex gap-3">{warning ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--warning)]" /> : <Lightbulb className="mt-0.5 size-5 shrink-0 text-[#aaa1ff]" />}<div><p className="text-sm font-semibold">{text(block.content, "title")}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text(block.content, "text")}</p></div></div></div>; }
      if (block.block_type === "checklist") { const items = Array.isArray(block.content.items) ? block.content.items.filter((item): item is string => typeof item === "string") : []; return <div key={block.id} className="card p-5 sm:p-6"><p className="text-sm font-semibold">{text(block.content, "title")}</p><ul className="mt-5 grid gap-3.5">{items.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#cdd0dc]"><span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-[var(--success)]/15 text-[var(--success)] shadow-[0_0_10px_rgba(73,214,162,.12)]"><Check className="size-2.5" strokeWidth={3} /></span>{item}</li>)}</ul></div>; }
      if (block.block_type === "prompt") return <PromptCard key={block.id} lessonId={lessonId} title={text(block.content, "title")} description={text(block.content, "description")} text={text(block.content, "text")} />;
      if (block.block_type === "file") return <a key={block.id} href={text(block.content, "url")} target="_blank" rel="noreferrer" className="card interactive-card focus-ring flex items-center justify-between p-4"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/[.05]"><FileText className="size-4" /></span><span><strong className="block text-sm">{text(block.content, "title")}</strong><span className="mt-1 block text-xs text-[var(--muted)]">Дополнительный материал</span></span></span><Download className="size-4 text-[var(--muted)]" /></a>;
      if (block.block_type === "video") return <VideoPlayer key={block.id} type={text(block.content, "type")} url={text(block.content, "url")} />;
      if (block.block_type === "image") return <a key={block.id} href={text(block.content, "url")} target="_blank" rel="noreferrer" className="card block p-5 text-sm font-semibold">{text(block.content, "title") || "Открыть изображение"} <ExternalLink className="ml-2 inline size-4" /></a>;
      return null;
    })}
  </div>;
}
