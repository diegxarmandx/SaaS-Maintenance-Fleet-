import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-[var(--shadow-card)] transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:bg-surface-muted disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}
