import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { SignupForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function SignupPage() {
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
        <h1 className="mt-3 text-2xl font-semibold text-navy">Create owner account</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Start a single-owner workspace for fleet maintenance records.
        </p>
      </div>
      <SignupForm />
      <p className="mt-4 text-xs leading-5 text-muted">
        By creating an account, you agree to the{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/terms"
        >
          Terms
        </Link>{" "}
        and acknowledge the{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/privacy"
        >
          Privacy Notice
        </Link>
        .
      </p>
      <p className="mt-6 text-sm text-muted">
        Already registered?{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/login"
        >
          Sign in
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
