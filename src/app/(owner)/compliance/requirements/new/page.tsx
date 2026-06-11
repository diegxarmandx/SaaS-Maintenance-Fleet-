import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { ComplianceRequirementForm } from "@/features/compliance/components/compliance-requirement-form";
import { getComplianceFormOptions } from "@/features/compliance/server/queries";

export const metadata: Metadata = {
  title: "Assign Compliance Requirement",
};

export const dynamic = "force-dynamic";

export default async function NewComplianceRequirementPage() {
  const options = await getComplianceFormOptions();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Compliance", href: "/compliance" },
          { label: "Assign requirement" },
        ]}
      />
      <PageHeader
        description="Assign a required compliance category to one asset so missing records are visible."
        eyebrow="Compliance"
        title="Assign compliance requirement"
      />
      <ComplianceRequirementForm options={options} />
    </>
  );
}
