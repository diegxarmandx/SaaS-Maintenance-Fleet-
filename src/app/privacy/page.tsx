import type { Metadata } from "next";

import {
  legalLastUpdated,
  privacySections,
} from "@/features/legal/content";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Maintly privacy notice draft for small-fleet owners.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      description="A plain-language privacy notice draft for the owner-only fleet maintenance product."
      eyebrow="Legal"
      lastUpdated={legalLastUpdated}
      sections={privacySections}
      title="Privacy Notice"
    />
  );
}
