import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleHelp,
  Clock3,
  XCircle,
} from "lucide-react";

import type { AssetAttentionStatus } from "@/features/fleet/types";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: AssetAttentionStatus;
  className?: string | undefined;
};

const statusStyles: Record<AssetAttentionStatus, string> = {
  Current: "border-primary/25 bg-primary/10 text-primary",
  "Due soon": "border-accent/35 bg-accent/10 text-accent-foreground",
  "Expiring soon": "border-accent/35 bg-accent/10 text-accent-foreground",
  Overdue: "border-danger/25 bg-danger/10 text-danger",
  Expired: "border-danger/25 bg-danger/10 text-danger",
  Missing: "border-sky-700/25 bg-sky-50 text-sky-800",
  Archived: "border-border bg-surface-muted text-muted",
};

const statusIcons = {
  Current: CheckCircle2,
  "Due soon": Clock3,
  "Expiring soon": Clock3,
  Overdue: AlertTriangle,
  Expired: XCircle,
  Missing: CircleHelp,
  Archived: Archive,
} as const;

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const Icon = statusIcons[status];

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
        statusStyles[status],
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {status}
    </span>
  );
}
