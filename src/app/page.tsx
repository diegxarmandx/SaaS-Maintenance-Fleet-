import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileClock, Gauge, ShieldCheck } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ownerModules } from "@/features/navigation";

const readinessItems = [
  {
    title: "Assets",
    description: "Vehicle, trailer, and equipment records stay owner-managed.",
    icon: Gauge,
  },
  {
    title: "Maintenance",
    description: "Rules, reminders, readings, history, and costs are in scope.",
    icon: ClipboardCheck,
  },
  {
    title: "Compliance",
    description: "Requirements, documents, and expiration alerts are prepared.",
    icon: ShieldCheck,
  },
  {
    title: "Reports",
    description: "Owner-facing summaries are planned without dispatch or payroll.",
    icon: FileClock,
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-border pb-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              FleetReady
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Owner-only fleet maintenance workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              A focused foundation for small fleet owners to manage assets, readings,
              preventive maintenance, compliance, documents, alerts, and reports.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Link className={buttonClassName({ variant: "primary" })} href="/dashboard">
              Open dashboard
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className={buttonClassName({ variant: "secondary" })} href="/login">
              Sign in
            </Link>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {readinessItems.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon aria-hidden="true" className="h-5 w-5 text-primary" />
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section aria-labelledby="prepared-routes" className="grid gap-3 md:grid-cols-2">
          <div>
            <h2 id="prepared-routes" className="text-xl font-semibold text-foreground">
              Prepared routes
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Each route has a placeholder surface and scoped module boundary ready for
              implementation.
            </p>
          </div>
          <div className="grid gap-2">
            {ownerModules.map((module) => (
              <Link
                key={module.href}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                href={module.href}
              >
                {module.title}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
