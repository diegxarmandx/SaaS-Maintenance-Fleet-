import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { CompletedMaintenanceForm } from "@/features/maintenance/components/completed-maintenance-form";
import {
  getMaintenanceFormOptions,
  type MaintenanceSearchParams,
} from "@/features/maintenance/server/queries";

export const metadata: Metadata = {
  title: "Record Completed Maintenance",
};

export const dynamic = "force-dynamic";

type CompleteMaintenancePageProps = {
  searchParams: Promise<MaintenanceSearchParams>;
};

export default async function CompleteMaintenancePage({
  searchParams,
}: CompleteMaintenancePageProps) {
  const params = await searchParams;
  const assetId = Array.isArray(params.assetId) ? params.assetId[0] : params.assetId;
  const ruleId = Array.isArray(params.ruleId) ? params.ruleId[0] : params.ruleId;
  const options = await getMaintenanceFormOptions();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Maintenance", href: "/maintenance" },
          { label: "Record completed" },
        ]}
      />
      <PageHeader
        description="Save a completed preventive maintenance record and advance the selected rule's next due values."
        eyebrow="Maintenance"
        title="Record completed maintenance"
      />
      <CompletedMaintenanceForm
        cancelHref="/maintenance"
        defaultAssetId={assetId}
        defaultRuleId={ruleId}
        mode="create"
        options={options}
      />
    </>
  );
}
