"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

type GlobalErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorBoundary({ error, reset }: GlobalErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center bg-background px-4">
          <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-danger">
              System error
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">
              Maintly needs a refresh.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">{getErrorMessage(error)}</p>
            <Button className="mt-6" type="button" onClick={reset}>
              Try again
            </Button>
          </section>
        </main>
      </body>
    </html>
  );
}
