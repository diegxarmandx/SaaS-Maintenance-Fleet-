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
  Current: "border-success/25 bg-success/10 text-success",
  Active: "border-success/25 bg-success/10 text-success",
  "Due soon": "border-warning/30 bg-warning/10 text-warning-foreground",
  "Expiring soon": "border-warning/30 bg-warning/10 text-warning-foreground",
  Overdue: "border-danger/25 bg-danger/10 text-danger",
  Expired: "border-danger/25 bg-danger/10 text-danger",
  "Past due": "border-danger/25 bg-danger/10 text-danger",
  Missing: "border-warning/30 bg-warning/10 text-warning-foreground",
  Archived: "border-border bg-surface-muted text-muted",
  Canceled: "border-border bg-surface-muted text-muted",
  "Read-only": "border-info/25 bg-info/10 text-info",
};

const statusIcons = {
  Current: CheckCircle2,
  Active: CheckCircle2,
  "Due soon": Clock3,
  "Expiring soon": Clock3,
  Overdue: AlertTriangle,
  Expired: XCircle,
  "Past due": AlertTriangle,
  Missing: CircleHelp,
  Archived: Archive,
  Canceled: XCircle,
  "Read-only": Clock3,
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
