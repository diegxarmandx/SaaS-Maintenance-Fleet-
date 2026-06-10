"use client";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";

type FleetErrorProps = {
  error: Error;
  reset: () => void;
};

export default function FleetError({ error, reset }: FleetErrorProps) {
  return (
    <div className="grid gap-4">
      <ErrorMessage message={error.message} title="Fleet assets could not load" />
      <div>
        <Button onClick={reset} type="button" variant="secondary">
          Try again
        </Button>
      </div>
    </div>
  );
}
