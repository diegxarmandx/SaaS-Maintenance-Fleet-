import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-[var(--shadow-card)] transition-colors hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:bg-surface-muted disabled:text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
