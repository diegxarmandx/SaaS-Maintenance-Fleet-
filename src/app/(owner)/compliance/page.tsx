import type { Metadata } from "next";

import { ComplianceOverviewPage } from "@/features/compliance/components/compliance-overview-page";
import {
  getComplianceOverview,
  type ComplianceSearchParams,
} from "@/features/compliance/server/queries";

export const metadata: Metadata = {
  title: "Compliance",
};

export const dynamic = "force-dynamic";

type CompliancePageProps = {
  searchParams: Promise<ComplianceSearchParams>;
};

export default async function CompliancePage({ searchParams }: CompliancePageProps) {
  const overview = await getComplianceOverview(await searchParams);

  return <ComplianceOverviewPage overview={overview} />;
}
