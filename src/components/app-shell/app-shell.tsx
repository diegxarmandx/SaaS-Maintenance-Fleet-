import type { PropsWithChildren } from "react";
import Link from "next/link";

import { OwnerNavigation } from "@/components/app-shell/owner-navigation";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh bg-background">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow"
        href="#main-content"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-surface/80 px-4 py-5 lg:block">
          <Link className="flex items-center gap-3 px-2" href="/dashboard">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              FR
            </span>
            <span>
              <span className="block text-base font-semibold text-foreground">
                FleetReady
              </span>
              <span className="block text-xs text-muted">Owner workspace</span>
            </span>
          </Link>
          <OwnerNavigation className="mt-8" />
          <form action={signOutAction} className="mt-8 px-2">
            <Button className="w-full" type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <Link className="flex items-center gap-2" href="/dashboard">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  FR
                </span>
                <span className="text-base font-semibold text-foreground">
                  FleetReady
                </span>
              </Link>
            </div>
            <OwnerNavigation className="mt-3 flex overflow-x-auto pb-1" compact />
            <form action={signOutAction} className="mt-3">
              <Button className="w-full" size="sm" type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </header>
          <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
