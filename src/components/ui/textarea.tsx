import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground shadow-[var(--shadow-card)] transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:bg-surface-muted disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}
