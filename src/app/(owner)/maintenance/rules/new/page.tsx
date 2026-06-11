import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { MaintenanceRuleForm } from "@/features/maintenance/components/maintenance-rule-form";
import { getMaintenanceFormOptions } from "@/features/maintenance/server/queries";

export const metadata: Metadata = {
  title: "Add Maintenance Rule",
};

export const dynamic = "force-dynamic";

export default async function NewMaintenanceRulePage() {
  const options = await getMaintenanceFormOptions();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Maintenance", href: "/maintenance" },
          { label: "Add rule" },
        ]}
      />
      <PageHeader
        description="Create an owner-managed preventive maintenance reminder for one asset."
        eyebrow="Maintenance"
        title="Add maintenance rule"
      />
      <MaintenanceRuleForm options={options} />
    </>
  );
}
