"use client";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";

type MaintenanceErrorProps = {
  error: Error;
  reset: () => void;
};

export default function MaintenanceError({ error, reset }: MaintenanceErrorProps) {
  return (
    <div className="grid gap-4">
      <ErrorMessage message={error.message} title="Maintenance could not load" />
      <div>
        <Button onClick={reset} type="button" variant="secondary">
          Try again
        </Button>
      </div>
    </div>
  );
}
