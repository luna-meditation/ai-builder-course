import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "border border-white/10 bg-[linear-gradient(135deg,#8877ff_0%,#6555ea_52%,#5177ee_100%)] text-white shadow-[0_14px_36px_rgba(100,83,234,.3),inset_0_1px_0_rgba(255,255,255,.22)] hover:brightness-110 hover:shadow-[0_18px_44px_rgba(100,83,234,.4),inset_0_1px_0_rgba(255,255,255,.22)]",
  secondary: "border border-[var(--border-strong)] bg-white/[.055] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,.04)] hover:border-white/[.2] hover:bg-white/[.09]",
  ghost: "text-[var(--muted)] hover:bg-white/[.055] hover:text-[var(--text)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110",
};

export function Button({ className, variant = "primary", loading, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; loading?: boolean }) {
  return <button className={cn("focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,filter] duration-300 active:scale-[.975] disabled:pointer-events-none disabled:opacity-50", variants[variant], className)} disabled={disabled || loading} {...props}>
    {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}{children}
  </button>;
}

export function ButtonLink({ href, className, variant = "primary", children }: { href: string; className?: string; variant?: keyof typeof variants; children: ReactNode }) {
  return <Link href={href} className={cn("focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,filter] duration-300 active:scale-[.975]", variants[variant], className)}>{children}</Link>;
}
