import type { Metadata } from "next";

import { DashboardPageView } from "@/features/dashboard/components/dashboard-page";
import { getDashboardData } from "@/features/dashboard/server/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return <DashboardPageView dashboard={dashboard} />;
}
