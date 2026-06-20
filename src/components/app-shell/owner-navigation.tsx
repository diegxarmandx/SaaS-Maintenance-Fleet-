"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FileArchive,
  Gauge,
  Inbox,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { ownerModules } from "@/features/navigation";
import { cn } from "@/lib/utils";

type OwnerNavigationProps = {
  className?: string;
  compact?: boolean;
};

const icons = {
  "/dashboard": LayoutDashboard,
  "/fleet": Gauge,
  "/maintenance": ClipboardCheck,
  "/inbox": Inbox,
  "/compliance": ShieldCheck,
  "/documents": FileArchive,
  "/reports": BarChart3,
  "/settings": Settings,
} as const;

export function OwnerNavigation({ className, compact = false }: OwnerNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Owner modules"
      className={cn("gap-1", compact ? "flex" : "grid", className)}
    >
      {ownerModules.map((item) => {
        const Icon = icons[item.href];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              compact && "min-w-max",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-surface-muted hover:text-foreground",
            )}
            href={item.href}
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
