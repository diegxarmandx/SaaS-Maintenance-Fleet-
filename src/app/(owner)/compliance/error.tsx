"use client";

import { ErrorMessage } from "@/components/ui/error-message";

export default function ComplianceError({ error }: { error: Error }) {
  return <ErrorMessage message={error.message} title="Compliance could not be loaded" />;
}
