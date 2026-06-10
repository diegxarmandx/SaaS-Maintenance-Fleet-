import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Not found
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          This FleetReady route is not available.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Return to the owner dashboard or choose one of the prepared module routes.
        </p>
        <Link className={buttonClassName({ className: "mt-6" })} href="/dashboard">
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}
