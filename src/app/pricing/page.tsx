import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  Gauge,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { subscriptionPlans } from "@/features/billing/plans";
import { legalLinks } from "@/features/legal/content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Maintly subscription tiers for owner-managed fleets with up to 30 active assets.",
};

const includedFeatures = [
  "Preventive maintenance schedules",
  "Service reminders and vehicle history",
  "Compliance and document tracking",
  "Repair costs and owner reports",
] as const;

const billingRedirect = encodeURIComponent("/settings#subscription");

export default function PricingPage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-white/10 bg-navy text-white">
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
          <div className="flex items-center gap-2">
            <Link
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "text-white hover:bg-white/10",
              })}
              href={`/login?redirectTo=${billingRedirect}`}
            >
              Log In
            </Link>
            <Link className={buttonClassName({ size: "sm" })} href="/signup">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-border bg-navy text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(20,184,166,0.24),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0),rgba(15,118,110,0.12))]"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-300">
              Pricing by active asset
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Simple pricing for small fleets.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Every tier includes the complete owner workspace. Choose the active-asset
              limit that fits your fleet today, starting with a no-cost one-asset plan.
            </p>
          </div>
          <div className="mt-10 grid gap-4 text-sm text-slate-200 sm:grid-cols-3">
            <PricingPrinciple
              icon={Gauge}
              text="Only active, non-archived assets count toward your limit."
            />
            <PricingPrinciple
              icon={LockKeyhole}
              text="Your maintenance records and documents stay private."
            />
            <PricingPrinciple
              icon={CreditCard}
              text="Secure subscription checkout and billing through Stripe."
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Subscription plans"
        className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8"
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {subscriptionPlans.map((plan) => (
            <article
              className={
                plan.highlight
                  ? "relative flex flex-col rounded-xl border-2 border-primary bg-surface p-6 shadow-[var(--shadow-elevated)]"
                  : "flex flex-col rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
              }
              key={plan.key}
            >
              {plan.highlight ? (
                <span className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  Best fit for most fleets
                </span>
              ) : null}
              <div>
                <h2 className="text-xl font-semibold text-navy">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted">
                  {plan.description}
                </p>
              </div>
              <div className="mt-6 border-y border-border py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                  Suggested monthly price
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-navy">
                  {plan.suggestedMonthlyPrice.replace("/mo", "")}
                  <span className="ml-1 text-sm font-medium text-muted">/ month</span>
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {plan.assetRangeLabel}
                </p>
              </div>
              <ul className="mt-6 grid flex-1 gap-3 text-sm text-foreground">
                {includedFeatures.map((feature) => (
                  <li className="flex gap-3" key={feature}>
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                className={buttonClassName({
                  variant: plan.highlight ? "primary" : "secondary",
                  className: "mt-7 w-full",
                })}
                href={`/signup?plan=${plan.key}`}
              >
                Choose {plan.name}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-surface-muted p-5 text-sm leading-6 text-muted sm:flex sm:items-center sm:justify-between sm:gap-8">
          <p>
            Prices shown are the current launch ranges. Final recurring amounts are
            controlled by the Stripe Price IDs configured for each paid tier. Free does
            not require Stripe Checkout.
          </p>
          <Link
            className="mt-3 inline-flex shrink-0 items-center gap-2 font-semibold text-primary hover:underline sm:mt-0"
            href={`/login?redirectTo=${billingRedirect}`}
          >
            Existing owner? Open billing
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              Stripe-ready billing
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-navy">
              Account first. Secure checkout next.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Your plan choice follows you through signup and company setup. Once the
              workspace exists, Maintly sends the selected Stripe Price ID to Stripe
              Checkout. Verified webhooks—not the return page—activate the subscription.
            </p>
          </div>
          <Link className={buttonClassName()} href="/signup?plan=small_fleet">
            Start with Small Fleet
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
            <Link className="hover:text-white" href="/">
              Home
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

function PricingPrinciple({
  icon: Icon,
  text,
}: {
  icon: typeof Gauge;
  text: string;
}) {
  return (
    <div className="flex gap-3 border-l border-white/20 pl-4">
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
      <p className="leading-6">{text}</p>
    </div>
  );
}
