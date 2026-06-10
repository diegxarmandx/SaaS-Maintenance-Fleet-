import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          FleetReady
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Access the owner workspace for fleet maintenance and compliance.
        </p>
      </div>
      <LoginForm />
      <p className="mt-6 text-sm text-muted">
        New owner?{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/signup"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
