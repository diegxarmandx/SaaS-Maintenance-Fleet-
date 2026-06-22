import type { Metadata } from "next";
import Link from "next/link";

import { PasswordResetRequestForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ForgotPasswordPage() {
  return (
    <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Maintly
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Request a secure password reset link for the owner account.
        </p>
      </div>
      <PasswordResetRequestForm />
      <p className="mt-6 text-sm text-muted">
        Remembered it?{" "}
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
