"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FileArchive,
  Gauge,
  Inbox,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ownerModules } from "@/features/navigation";
import { cn } from "@/lib/utils";

type MobileOwnerNavigationProps = {
  className?: string | undefined;
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

export function MobileOwnerNavigation({ className }: MobileOwnerNavigationProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("grid gap-2", className)}>
      <Button
        aria-controls="mobile-owner-navigation"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen((current) => !current)}
        type="button"
        variant="secondary"
      >
        <span className="inline-flex items-center gap-2">
          {open ? (
            <X aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Menu aria-hidden="true" className="h-4 w-4" />
          )}
          Owner navigation
        </span>
        <span className="text-xs text-muted">{open ? "Close" : "Open"}</span>
      </Button>
      {open ? (
        <nav
          aria-label="Owner modules mobile"
          className="grid gap-1 rounded-lg border border-border bg-surface p-2 shadow-sm"
          id="mobile-owner-navigation"
        >
          {ownerModules.map((item) => {
            const Icon = icons[item.href];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
