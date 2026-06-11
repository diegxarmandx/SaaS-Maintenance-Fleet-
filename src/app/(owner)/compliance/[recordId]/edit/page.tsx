import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { ComplianceRecordForm } from "@/features/compliance/components/compliance-record-form";
import {
  getComplianceFormOptions,
  getComplianceRecordDetail,
} from "@/features/compliance/server/queries";

type EditComplianceRecordPageProps = {
  params: Promise<{
    recordId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Edit Compliance Record",
};

export const dynamic = "force-dynamic";

export default async function EditComplianceRecordPage({
  params,
}: EditComplianceRecordPageProps) {
  const { recordId } = await params;
  const [record, options] = await Promise.all([
    getComplianceRecordDetail(recordId),
    getComplianceFormOptions(),
  ]);

  if (!record || !record.recordId) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Compliance", href: "/compliance" },
          { label: record.compliance_type, href: `/compliance/${record.recordId}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Correct owner-entered compliance details or replace the supporting document."
        eyebrow="Compliance"
        title="Edit compliance record"
      />
      <ComplianceRecordForm
        cancelHref={`/compliance/${record.recordId}`}
        mode="edit"
        options={options}
        record={record}
      />
    </>
  );
}
