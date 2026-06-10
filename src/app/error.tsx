"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

type AppErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppErrorBoundary({ error, reset }: AppErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-danger">
          Application error
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          The workspace could not finish loading.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">{getErrorMessage(error)}</p>
        <Button className="mt-6" type="button" onClick={reset}>
          Try again
        </Button>
      </section>
    </main>
  );
}
