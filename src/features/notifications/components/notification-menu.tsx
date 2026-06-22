import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import type { OwnerNotification } from "@/features/notifications/types";
import { cn } from "@/lib/utils";

type NotificationMenuProps = {
  notifications: OwnerNotification[];
};

export function NotificationMenu({ notifications }: NotificationMenuProps) {
  const unreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;

  return (
    <details className="relative">
      <summary
        aria-label={`${unreadCount} unread notifications`}
        className="relative flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-[var(--shadow-card)] transition-colors hover:border-slate-300 hover:text-primary"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-3 text-sm shadow-[var(--shadow-elevated)]">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button
                className={buttonClassName({ variant: "secondary", size: "sm" })}
                type="submit"
              >
                <CheckCheck aria-hidden="true" className="h-4 w-4" />
                Mark all read
              </button>
            </form>
          ) : null}
        </div>
        {notifications.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border bg-background p-3 text-sm text-muted">
            No active notifications.
          </p>
        ) : (
          <ol className="mt-3 max-h-96 divide-y divide-border overflow-y-auto">
            {notifications.map((notification) => (
              <li className="py-3" key={notification.id}>
                <div className="grid grid-cols-[1fr_auto] gap-2 rounded-md p-2 hover:bg-surface-muted">
                  <Link className="block" href={notification.href ?? "/dashboard"}>
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-normal",
                        notification.severity === "critical"
                          ? "text-danger"
                          : notification.severity === "warning"
                            ? "text-accent-foreground"
                            : "text-muted",
                      )}
                    >
                      {notification.severity}
                    </span>
                    <span className="mt-1 block font-medium text-foreground">
                      {notification.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      {notification.message}
                    </span>
                  </Link>
                  {!notification.read_at ? (
                    <form action={markNotificationReadAction.bind(null, notification.id)}>
                      <button
                        aria-label={`Mark ${notification.title} as read`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted hover:text-primary"
                        type="submit"
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
