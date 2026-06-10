import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm transition placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}
