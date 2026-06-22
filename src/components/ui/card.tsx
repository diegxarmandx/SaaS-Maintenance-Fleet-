import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type DivProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ className, children, ...props }: DivProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      {children}
    </article>
  );
}

export function CardHeader({ className, children, ...props }: DivProps) {
  return (
    <div className={cn("flex flex-col gap-2 p-5 pb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: DivProps) {
  return (
    <h2
      className={cn("text-base font-semibold leading-6 text-foreground", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...props }: DivProps) {
  return (
    <p className={cn("text-sm leading-6 text-muted", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: DivProps) {
  return (
    <div className={cn("p-5 pt-2", className)} {...props}>
      {children}
    </div>
  );
}
