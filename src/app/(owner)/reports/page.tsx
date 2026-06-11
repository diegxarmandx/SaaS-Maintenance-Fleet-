import type { Metadata } from "next";

import { ReportsPageView } from "@/features/reports/components/reports-page";
import {
  getReportData,
  type ReportSearchParams,
} from "@/features/reports/server/queries";

export const metadata: Metadata = {
  title: "Reports",
};

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams: Promise<ReportSearchParams>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const reports = await getReportData(await searchParams);

  return <ReportsPageView reports={reports} />;
}
