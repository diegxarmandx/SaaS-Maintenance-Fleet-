import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { LoginForm } from "@/features/auth/components/auth-form";
import { emailConfirmedMessage } from "@/features/auth/signup-flow";

export const metadata: Metadata = {
  title: "Sign In",
};

type LoginPageProps = {
  searchParams: Promise<{
    confirmed?: string | string[] | undefined;
    redirectTo?: string | string[] | undefined;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = Array.isArray(params.redirectTo)
    ? params.redirectTo[0]
    : params.redirectTo;
  const confirmed = Array.isArray(params.confirmed)
    ? params.confirmed[0]
    : params.confirmed;

  return (
    <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
      <Link
        className={buttonClassName({
          variant: "ghost",
          size: "sm",
          className: "-ml-2 mb-6",
        })}
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to landing page
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Maintly
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-navy">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Access the owner workspace for fleet maintenance and compliance.
        </p>
      </div>
      {confirmed === "1" ? (
        <p
          className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm leading-6 text-primary"
          role="status"
        >
          {emailConfirmedMessage}
        </p>
      ) : null}
      <LoginForm redirectTo={redirectTo} />
      <p className="mt-4 text-sm text-muted">
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          Reset password
        </Link>
      </p>
      <p className="mt-6 text-sm text-muted">
        New owner?{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/signup"
        >
          Create an account
        </Link>
      </p>
      <nav
        aria-label="Account support links"
        className="mt-6 flex flex-wrap gap-4 text-xs"
      >
        <Link className="font-medium text-muted hover:text-primary" href="/support">
          Support
        </Link>
        <Link className="font-medium text-muted hover:text-primary" href="/privacy">
          Privacy
        </Link>
        <Link className="font-medium text-muted hover:text-primary" href="/terms">
          Terms
        </Link>
      </nav>
    </section>
  );
}
