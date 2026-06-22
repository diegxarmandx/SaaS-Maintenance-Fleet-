import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetricTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<MetricTone, { rail: string; icon: string }> = {
  neutral: { rail: "bg-slate-300", icon: "bg-surface-muted text-muted" },
  primary: { rail: "bg-primary", icon: "bg-primary/10 text-primary" },
  success: { rail: "bg-success", icon: "bg-success/10 text-success" },
  warning: {
    rail: "bg-warning",
    icon: "bg-warning/10 text-warning-foreground",
  },
  danger: { rail: "bg-danger", icon: "bg-danger/10 text-danger" },
  info: { rail: "bg-info", icon: "bg-info/10 text-info" },
};

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: number | string;
  detail?: string;
  icon?: ReactNode;
  tone?: MetricTone;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${styles.rail}`}
      />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold leading-none text-navy">{value}</p>
          {detail ? <p className="mt-2 text-xs text-muted">{detail}</p> : null}
        </div>
        {icon ? (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </section>
  );
}
