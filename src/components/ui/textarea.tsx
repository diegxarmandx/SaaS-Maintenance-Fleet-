import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground shadow-sm transition placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}
