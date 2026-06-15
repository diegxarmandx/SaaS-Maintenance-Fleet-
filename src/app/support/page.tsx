import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { serverEnv } from "@/lib/env/server";
import { getSupportContact } from "@/features/legal/support";

export const metadata: Metadata = {
  title: "Support",
  description: "FleetReady support contact information and request guidance.",
};

export default function SupportPage() {
  const support = getSupportContact(serverEnv.SUPPORT_EMAIL);

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-8",
          })}
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to FleetReady
        </Link>

        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Support
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Owner support
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Contact support for account access, exports, deletion requests, billing
            questions, or unexpected application behavior. Do not include passwords,
            authentication tokens, or private document files in a support message.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <Card>
            <CardHeader>
              <CardTitle>Support contact</CardTitle>
              <CardDescription>{support.statusMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              {support.configured && support.mailtoHref && support.email ? (
                <a
                  className={buttonClassName({ variant: "primary" })}
                  href={support.mailtoHref}
                >
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  Email {support.email}
                </a>
              ) : (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning-foreground">
                  Production support intake is disabled until SUPPORT_EMAIL is
                  configured.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
              <CardTitle>Safe support requests</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm leading-6 text-muted">
                <li>Use the owner account email when possible.</li>
                <li>Include the affected page and approximate time.</li>
                <li>Do not send passwords or signed document links.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
