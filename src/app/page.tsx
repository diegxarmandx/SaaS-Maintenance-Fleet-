import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  FileText,
  Gauge,
  History,
  ReceiptText,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { legalLinks } from "@/features/legal/content";

export const metadata: Metadata = {
  title: "Maintly | Fleet Maintenance Software for Small Fleet Owners",
  description:
    "Maintly helps small-fleet owners track preventive maintenance, mileage, service reminders, documents, compliance, and costs from one practical dashboard.",
};

const benefits = [
  {
    title: "Prevent missed maintenance",
    description: "Keep mileage, hour, and calendar service due dates visible.",
    icon: BellRing,
  },
  {
    title: "Track service history",
    description: "Build a dependable record for every truck, trailer, and machine.",
    icon: History,
  },
  {
    title: "Manage documents",
    description: "Keep registrations, insurance, inspections, and receipts organized.",
    icon: FileText,
  },
  {
    title: "Monitor costs",
    description: "See maintenance spending by asset without accounting clutter.",
    icon: ReceiptText,
  },
  {
    title: "Reduce downtime",
    description: "Catch overdue work and expirations before they stop a unit.",
    icon: Wrench,
  },
] as const;

const features = [
  {
    title: "Preventive maintenance",
    description:
      "Set recurring service rules by mileage, engine hours, or calendar intervals and keep the next due point clear.",
    icon: Wrench,
  },
  {
    title: "Service reminders",
    description:
      "Prioritize due-soon and overdue work from readings and dates you control.",
    icon: BellRing,
  },
  {
    title: "Repair and expense records",
    description:
      "Record completed work, providers, notes, receipts, and costs in one asset history.",
    icon: ReceiptText,
  },
  {
    title: "Vehicle history",
    description:
      "Review meter readings, maintenance, compliance, paperwork, and costs for each unit.",
    icon: History,
  },
  {
    title: "Fleet overview",
    description:
      "Scan active assets, due work, expiring documents, and missing requirements at a glance.",
    icon: Truck,
  },
] as const;

const workflow = [
  {
    number: "01",
    title: "Add your units",
    description:
      "Create records for the vehicles, trailers, and equipment you personally manage.",
  },
  {
    number: "02",
    title: "Set service rules",
    description:
      "Define oil changes, inspections, brakes, tires, and equipment-specific intervals.",
  },
  {
    number: "03",
    title: "Stay ready",
    description:
      "Log completed work, store paperwork, and act on the next item that needs attention.",
  },
] as const;

const attentionRows = [
  {
    unit: "DT-01",
    item: "Oil and filter service",
    detail: "Due in 640 miles",
    status: "Due soon" as const,
  },
  {
    unit: "MD-14",
    item: "Registration renewal",
    detail: "Expired 3 days ago",
    status: "Expired" as const,
  },
  {
    unit: "FB-03",
    item: "Annual inspection",
    detail: "Current through Sep 18",
    status: "Current" as const,
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <Image
          alt="Small commercial fleet parked outside a maintenance garage"
          className="absolute inset-0 z-0 h-full w-full object-cover object-[45%_center] sm:object-[62%_center]"
          fill
          priority
          sizes="100vw"
          src="/images/fleetready-industrial-yard.png"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-navy/45"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(15,23,42,0.88),rgba(15,23,42,0.66)_50%,rgba(15,118,110,0.34)),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(15,23,42,0.66))]"
        />
        <header className="relative z-10 border-b border-white/15">
          <nav
            aria-label="Main navigation"
            className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
          >
            <Link className="flex items-center gap-3 text-white" href="/">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary shadow-lg">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold">Maintly</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm font-medium text-slate-200 md:flex">
              <a className="transition hover:text-white" href="#features">
                Features
              </a>
              <a className="transition hover:text-white" href="#workflow">
                How it works
              </a>
              <a className="transition hover:text-white" href="#product">
                Product
              </a>
              <Link className="transition hover:text-white" href="/pricing">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link
                className={buttonClassName({
                  variant: "ghost",
                  size: "sm",
                  className: "text-white hover:bg-white/10",
                })}
                href="/login"
              >
                Log In
              </Link>
              <Link className={buttonClassName({ size: "sm" })} href="/signup">
                Get Started
              </Link>
            </div>
          </nav>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="max-w-2xl">
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.4)] sm:text-5xl lg:text-6xl">
              Maintenance control for small fleets.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-100 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)] sm:text-lg">
              Track vehicles, trailers, equipment, services, documents, expenses, and
              reminders from one simple dashboard built for small fleet operators.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className={buttonClassName()} href="/signup">
                Get Started
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a
                className={buttonClassName({
                  variant: "secondary",
                  className:
                    "border-white/45 bg-navy/45 text-white backdrop-blur-sm hover:border-white/70 hover:bg-navy/65",
                })}
                href="#features"
              >
                See How It Works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-100">
              <TrustPoint>Built for small fleets</TrustPoint>
              <TrustPoint>Private fleet documents</TrustPoint>
              <TrustPoint>No dispatch clutter</TrustPoint>
            </div>
          </div>

          <div
            aria-label="Maintly dashboard preview"
            className="mt-14 overflow-hidden rounded-lg border border-white/30 bg-surface text-foreground shadow-[var(--shadow-elevated)]"
            id="product"
          >
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                  Fleet readiness
                </p>
                <h2 className="mt-1 text-xl font-semibold text-navy">
                  Today&apos;s owner dashboard
                </h2>
              </div>
              <div className="inline-flex w-fit items-center gap-2 text-sm font-medium text-warning-foreground">
                <FileClock aria-hidden="true" className="h-4 w-4 text-warning" />5 items
                need attention
              </div>
            </div>
            <div className="grid bg-background md:grid-cols-[0.85fr_1.15fr]">
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 md:grid-cols-2">
                <PreviewMetric
                  icon={Gauge}
                  label="Active assets"
                  tone="primary"
                  value="12"
                />
                <PreviewMetric
                  icon={ClipboardCheck}
                  label="Due soon"
                  tone="warning"
                  value="4"
                />
                <PreviewMetric icon={Wrench} label="Overdue" tone="danger" value="2" />
                <PreviewMetric
                  icon={FileText}
                  label="Expired docs"
                  tone="danger"
                  value="1"
                />
              </div>
              <div className="border-t border-border bg-surface p-4 md:border-l md:border-t-0 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-navy">Needs attention</h3>
                  <span className="text-xs font-medium text-primary">Priority order</span>
                </div>
                <div className="divide-y divide-border">
                  {attentionRows.map((row) => (
                    <div
                      className="grid gap-2 py-3 sm:grid-cols-[84px_minmax(0,1fr)_auto] sm:items-center"
                      key={`${row.unit}-${row.item}`}
                    >
                      <span className="text-sm font-semibold text-navy">{row.unit}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {row.item}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {row.detail}
                        </span>
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface" aria-label="Owner benefits">
        <div className="mx-auto grid w-full max-w-7xl divide-y divide-border px-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-5 lg:px-8">
          {benefits.map((benefit) => (
            <div className="flex gap-3 px-3 py-6 sm:px-5" key={benefit.title}>
              <benefit.icon
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              />
              <div>
                <h2 className="text-sm font-semibold text-navy">{benefit.title}</h2>
                <p className="mt-1 text-xs leading-5 text-muted">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        id="features"
      >
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              Built for owner-managed fleets
            </p>
            <h2
              className="mt-3 text-3xl font-semibold leading-tight text-navy sm:text-4xl"
              id="features-heading"
            >
              Everything you need to keep every unit ready.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Maintly stays focused on the records a small fleet owner actually needs:
              assets, meters, preventive service, compliance, documents, alerts, and
              costs.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {features.map((feature) => (
              <div
                className="grid gap-3 py-5 sm:grid-cols-[44px_190px_minmax(0,1fr)] sm:items-start"
                key={feature.title}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-navy">{feature.title}</h3>
                <p className="text-sm leading-6 text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-navy text-white"
        id="workflow"
        aria-labelledby="workflow-title"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <h2
              className="text-3xl font-semibold leading-tight text-white sm:text-4xl"
              id="workflow-title"
            >
              A clear path from first unit to fleet readiness.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Set up the fleet once, then keep the next service, expiration, or document
              action visible.
            </p>
          </div>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-700 bg-slate-700 md:grid-cols-3">
            {workflow.map((step) => (
              <li className="bg-navy-muted p-6" key={step.number}>
                <span className="font-mono text-sm font-semibold text-teal-300">
                  {step.number}
                </span>
                <h3 className="mt-6 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              Ready for the next service date
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold leading-tight text-navy sm:text-3xl">
              Put your fleet records, maintenance, and paperwork in one owner workspace.
            </h2>
          </div>
          <Link
            className={buttonClassName({
              className: "w-full shrink-0 md:w-auto",
            })}
            href="/signup"
          >
            Get Started
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-primary px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal-100">
              Plans for 1 to 30 active assets
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Choose the plan that fits your fleet.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50 sm:text-base">
              Start with the active-asset limit you need now. Every tier includes the
              complete maintenance, compliance, document, and reporting workspace.
            </p>
          </div>
          <Link
            className={buttonClassName({
              variant: "secondary",
              className:
                "w-full border-white bg-white text-navy hover:border-white hover:bg-teal-50 lg:w-auto",
            })}
            href="/pricing"
          >
            View pricing
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-navy text-slate-300">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link className="flex items-center gap-2 font-semibold text-white" href="/">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-teal-300" />
            Maintly
          </Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
            <a className="hover:text-white" href="#features">
              Features
            </a>
            <a className="hover:text-white" href="#workflow">
              How it works
            </a>
            <Link className="hover:text-white" href="/pricing">
              Pricing
            </Link>
            <Link className="hover:text-white" href="/login">
              Log In
            </Link>
            {legalLinks.map((link) => (
              <Link className="hover:text-white" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}

function TrustPoint({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-teal-300" />
      {children}
    </span>
  );
}

function PreviewMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "primary" | "warning" | "danger";
}) {
  const toneClassName =
    tone === "warning"
      ? "text-warning"
      : tone === "danger"
        ? "text-danger"
        : "text-primary";

  return (
    <div className="bg-surface p-4 sm:p-5">
      <Icon aria-hidden="true" className={`h-5 w-5 ${toneClassName}`} />
      <p className="mt-4 text-3xl font-semibold text-navy">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
