import type { Metadata } from "next";

import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";

export const metadata: Metadata = {
  title: "Company Onboarding",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            FleetReady
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            Create your owner workspace
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Set up your company profile, measurement preferences, and contact details so
            your dashboard can organize fleet maintenance around your business.
          </p>
        </div>
        <OnboardingForm />
      </section>
    </main>
  );
}
