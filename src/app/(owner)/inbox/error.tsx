"use client";

import { ErrorMessage } from "@/components/ui/error-message";

export default function InboxError() {
  return (
    <ErrorMessage
      message="FleetReady could not load the Inbox right now. Try again in a moment."
      title="Inbox unavailable"
    />
  );
}
