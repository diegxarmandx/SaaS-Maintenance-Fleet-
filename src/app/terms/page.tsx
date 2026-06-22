import type { Metadata } from "next";

import { legalLastUpdated, termsSections } from "@/features/legal/content";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Maintly terms of service draft for small-fleet owners.",
};

export default function TermsPage() {
  return (
    <LegalPage
      description="Draft service terms for the owner-only fleet maintenance application."
      eyebrow="Legal"
      lastUpdated={legalLastUpdated}
      sections={termsSections}
      title="Terms of Service"
    />
  );
}
