import type { PropsWithChildren } from "react";
import Link from "next/link";
import { LogOut, Search, UserCircle } from "lucide-react";

import { OwnerNavigation } from "@/components/app-shell/owner-navigation";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { NotificationMenu } from "@/features/notifications/components/notification-menu";
import { getOwnerNotifications } from "@/features/notifications/service";
import { getOwnerWorkspaceContext } from "@/server/auth/owner-context";

export async function AppShell({ children }: PropsWithChildren) {
  const ownerContext = await getOwnerWorkspaceContext();
  const notifications = ownerContext.companyId
    ? await getOwnerNotifications(ownerContext.companyId)
    : [];

  return (
    <div className="min-h-dvh bg-background">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow"
        href="#main-content"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-surface/80 px-4 py-5 lg:flex lg:flex-col">
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
          <section
            aria-label="Current company"
            className="mt-6 rounded-lg border border-border bg-surface-subtle p-3"
          >
            <p className="text-xs font-medium uppercase tracking-normal text-muted">
              Company
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {ownerContext.companyName}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">Single-owner workspace</p>
          </section>
          <OwnerNavigation className="mt-8" />
          <div className="mt-auto grid gap-3 px-2 pt-8">
            <details className="group rounded-lg border border-border bg-surface-subtle p-3 text-sm">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-foreground">
                <UserCircle aria-hidden="true" className="h-5 w-5 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {ownerContext.ownerName}
                  </span>
                  {ownerContext.ownerEmail ? (
                    <span className="block truncate text-xs text-muted">
                      {ownerContext.ownerEmail}
                    </span>
                  ) : null}
                </span>
              </summary>
              <form action={signOutAction} className="mt-3">
                <Button className="w-full" size="sm" type="submit" variant="secondary">
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Sign out
                </Button>
              </form>
            </details>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <Link className="flex items-center gap-2" href="/dashboard">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  FR
                </span>
                <span className="hidden text-base font-semibold text-foreground sm:block lg:hidden">
                  FleetReady
                </span>
                <span className="hidden min-w-0 lg:block">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {ownerContext.companyName}
                  </span>
                  <span className="block text-xs text-muted">Owner workspace</span>
                </span>
              </Link>
              <form
                action="/fleet"
                className="hidden min-w-0 flex-1 items-center justify-center px-4 md:flex"
              >
                <label className="relative w-full max-w-md" htmlFor="global-search">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  />
                  <input
                    aria-label="Search fleet records"
                    className="min-h-11 w-full rounded-lg border border-border bg-surface px-9 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20"
                    id="global-search"
                    name="q"
                    placeholder="Search fleet assets"
                    type="search"
                  />
                </label>
              </form>
              <div className="flex items-center gap-2">
                <NotificationMenu notifications={notifications} />
                <details className="relative">
                  <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-surface text-primary shadow-sm">
                    <UserCircle aria-hidden="true" className="h-5 w-5" />
                    <span className="sr-only">Owner profile menu</span>
                  </summary>
                  <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface p-3 text-sm shadow-lg">
                    <p className="font-medium text-foreground">
                      {ownerContext.ownerName}
                    </p>
                    {ownerContext.ownerEmail ? (
                      <p className="mt-1 truncate text-xs text-muted">
                        {ownerContext.ownerEmail}
                      </p>
                    ) : null}
                    <form action={signOutAction} className="mt-3">
                      <Button
                        className="w-full"
                        size="sm"
                        type="submit"
                        variant="secondary"
                      >
                        <LogOut aria-hidden="true" className="h-4 w-4" />
                        Sign out
                      </Button>
                    </form>
                  </div>
                </details>
              </div>
            </div>
            <form action="/fleet" className="mt-3 md:hidden">
              <label className="relative block" htmlFor="mobile-global-search">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
                <input
                  aria-label="Search fleet records"
                  className="min-h-11 w-full rounded-lg border border-border bg-surface px-9 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20"
                  id="mobile-global-search"
                  name="q"
                  placeholder="Search fleet records"
                  type="search"
                />
              </label>
            </form>
            <OwnerNavigation
              className="mt-3 flex overflow-x-auto pb-1 lg:hidden"
              compact
            />
          </header>
          <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
