import type { Metadata } from "next";
import Link from "next/link";

import { PasswordResetCompletionForm } from "@/features/auth/components/password-reset-completion-form";

export const metadata: Metadata = {
  title: "Choose New Password",
};

export default function ResetPasswordPage() {
  return (
    <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Maintly
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Complete the reset from the secure link sent by Supabase Auth.
        </p>
      </div>
      <PasswordResetCompletionForm />
      <p className="mt-6 text-sm text-muted">
        Ready?{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
