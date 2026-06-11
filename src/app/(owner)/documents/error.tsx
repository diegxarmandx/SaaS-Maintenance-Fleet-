"use client";

import { ErrorMessage } from "@/components/ui/error-message";

export default function DocumentsError({ error }: { error: Error }) {
  return <ErrorMessage message={error.message} title="Documents could not be loaded" />;
}
