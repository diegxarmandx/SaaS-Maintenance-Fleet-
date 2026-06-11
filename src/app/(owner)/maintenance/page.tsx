import type { Metadata } from "next";

import { MaintenanceOverviewPage } from "@/features/maintenance/components/maintenance-overview-page";
import {
  getMaintenanceHistory,
  getMaintenanceOverview,
  type MaintenanceSearchParams,
} from "@/features/maintenance/server/queries";

export const metadata: Metadata = {
  title: "Maintenance",
};

export const dynamic = "force-dynamic";

type MaintenancePageProps = {
  searchParams: Promise<MaintenanceSearchParams>;
};

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const params = await searchParams;
  const [overview, history] = await Promise.all([
    getMaintenanceOverview(params),
    getMaintenanceHistory(params),
  ]);

  return <MaintenanceOverviewPage history={history} overview={overview} />;
}
