import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ClipboardCheck,
  FileClock,
  Gauge,
  History,
  ReceiptText,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Fleet Maintenance Software for Small Fleet Owners",
  description:
    "FleetReady helps small-fleet owners track preventive maintenance, mileage, service reminders, documents, and repair costs from one dashboard.",
};

const features = [
  {
    title: "Preventive maintenance",
    description:
      "Set service schedules by mileage, engine hours, or calendar intervals before missed service becomes downtime.",
    icon: Wrench,
  },
  {
    title: "Service reminders",
    description:
      "See upcoming and overdue work clearly, with alerts based on the readings and dates you manage.",
    icon: BellRing,
  },
  {
    title: "Repair and expense records",
    description:
      "Record completed service, providers, notes, receipts, and costs without turning the app into accounting software.",
    icon: ReceiptText,
  },
  {
    title: "Vehicle history",
    description:
      "Keep each truck, trailer, or equipment file organized with readings, service history, compliance, and documents.",
    icon: History,
  },
  {
    title: "Fleet overview",
    description:
      "Scan active assets, due work, expiring documents, and missing compliance items from one owner dashboard.",
    icon: Truck,
  },
] as const;

const howItWorks = [
  {
    title: "Add your vehicles",
    description:
      "Create records for trucks, trailers, vans, or equipment with unit numbers, mileage, hours, and service notes.",
  },
  {
    title: "Set maintenance schedules",
    description:
      "Track recurring services like oil changes, inspections, brakes, tires, and equipment-specific maintenance.",
  },
  {
    title: "Track services and alerts",
    description:
      "Log completed work, store documents, and keep upcoming or overdue items visible before they surprise you.",
  },
] as const;

const previewRows = [
  ["DT-01", "Oil and filter", "Due soon"],
  ["MD-14", "Inspection document", "Expired"],
  ["FB-03", "Registration", "Current"],
] as const;

export default function Home() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface/95">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
        >
          <Link className="flex items-center gap-3 text-foreground" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Truck aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">FleetReady</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <a className="hover:text-primary" href="#features">
              Features
            </a>
            <a className="hover:text-primary" href="#how-it-works">
              How It Works
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className={buttonClassName({ variant: "ghost", size: "sm" })}
              href="/login"
            >
              Log In
            </Link>
            <Link
              className={buttonClassName({ variant: "primary", size: "sm" })}
              href="/signup"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              Small-fleet maintenance software
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Keep every service, reading, and expiration under control.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              FleetReady helps small-fleet owners and owner-operators track preventive
              maintenance, mileage or engine hours, repair costs, vehicle history,
              documents, and service alerts from one practical dashboard.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className={buttonClassName({ variant: "primary" })} href="/signup">
                Start Managing Your Fleet
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link className={buttonClassName({ variant: "secondary" })} href="/login">
                Log In
              </Link>
            </div>
          </div>

          <div
            aria-label="FleetReady dashboard preview"
            className="rounded-lg border border-border bg-background p-3 shadow-sm"
          >
            <div className="rounded-lg border border-border bg-surface">
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    Owner dashboard
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    Fleet readiness
                  </h2>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-warning bg-[#fff8eb] px-3 py-2 text-sm font-medium text-warning-foreground">
                  <FileClock aria-hidden="true" className="h-4 w-4" />5 items need
                  attention
                </div>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-3">
                <PreviewMetric label="Active assets" value="12" icon={Gauge} />
                <PreviewMetric label="Due soon" value="4" icon={ClipboardCheck} />
                <PreviewMetric label="Expired docs" value="1" icon={ShieldCheck} />
              </div>
              <div className="border-t border-border p-4">
                <div className="overflow-hidden rounded-lg border border-border">
                  {previewRows.map(([unit, item, status]) => (
                    <div
                      className="grid gap-2 border-b border-border bg-surface-subtle px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[0.7fr_1.4fr_0.9fr] sm:items-center"
                      key={`${unit}-${item}`}
                    >
                      <span className="font-semibold text-foreground">{unit}</span>
                      <span className="text-muted">{item}</span>
                      <span className="inline-flex w-fit items-center rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8"
        id="features"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            What owners track
          </p>
          <h2
            className="mt-3 text-3xl font-semibold leading-tight text-foreground"
            id="features-heading"
          >
            Maintenance records without fleet-management clutter.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            FleetReady focuses on owner-managed readiness: assets, readings, preventive
            service, compliance dates, documents, alerts, and reports.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon aria-hidden="true" className="h-5 w-5 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="how-heading"
        className="border-y border-border bg-surface"
        id="how-it-works"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              How It Works
            </p>
            <h2
              className="mt-3 text-3xl font-semibold leading-tight text-foreground"
              id="how-heading"
            >
              A short path from account to dashboard.
            </h2>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {howItWorks.map((step, index) => (
              <li
                className="rounded-lg border border-border bg-background p-5"
                key={step.title}
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              Ready when your next service is due
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Create your owner workspace and start with your fleet records.
            </h2>
          </div>
          <Link
            className={buttonClassName({
              variant: "primary",
              className: "w-full md:w-auto",
            })}
            href="/signup"
          >
            Sign Up
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="font-medium text-foreground">FleetReady</p>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
            <a className="hover:text-primary" href="#features">
              Features
            </a>
            <a className="hover:text-primary" href="#how-it-works">
              How It Works
            </a>
            <Link className="hover:text-primary" href="/login">
              Log In
            </Link>
            <Link className="hover:text-primary" href="/signup">
              Sign Up
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

type PreviewMetricProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

function PreviewMetric({ label, value, icon: Icon }: PreviewMetricProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-4">
      <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
      <p className="mt-4 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
