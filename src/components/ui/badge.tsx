import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClassNames: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-muted text-foreground",
  success: "border-primary/20 bg-primary/10 text-primary",
  warning: "border-accent/30 bg-accent/10 text-accent-foreground",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        toneClassNames[tone],
        className,
      )}
      {...props}
    />
  );
}
