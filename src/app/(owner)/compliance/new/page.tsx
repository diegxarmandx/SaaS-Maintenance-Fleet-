import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { ComplianceRecordForm } from "@/features/compliance/components/compliance-record-form";
import {
  getComplianceFormOptions,
  type ComplianceSearchParams,
} from "@/features/compliance/server/queries";

export const metadata: Metadata = {
  title: "Add Compliance Record",
};

export const dynamic = "force-dynamic";

type NewComplianceRecordPageProps = {
  searchParams: Promise<ComplianceSearchParams>;
};

export default async function NewComplianceRecordPage({
  searchParams,
}: NewComplianceRecordPageProps) {
  const [options, params] = await Promise.all([getComplianceFormOptions(), searchParams]);
  const firstParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Compliance", href: "/compliance" },
          { label: "Add record" },
        ]}
      />
      <PageHeader
        description="Record owner-entered compliance details and optionally attach the supporting document."
        eyebrow="Compliance"
        title="Add compliance record"
      />
      <ComplianceRecordForm
        cancelHref="/compliance"
        defaultAssetId={firstParam(params.assetId)}
        defaultComplianceType={firstParam(params.type)}
        defaultRequirementId={firstParam(params.requirementId)}
        mode="create"
        options={options}
      />
    </>
  );
}
