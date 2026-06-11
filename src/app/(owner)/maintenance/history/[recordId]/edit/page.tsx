import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { CompletedMaintenanceForm } from "@/features/maintenance/components/completed-maintenance-form";
import {
  getMaintenanceFormOptions,
  getMaintenanceRecordDetail,
} from "@/features/maintenance/server/queries";

type EditMaintenanceRecordPageProps = {
  params: Promise<{
    recordId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Edit Maintenance Record",
};

export const dynamic = "force-dynamic";

export default async function EditMaintenanceRecordPage({
  params,
}: EditMaintenanceRecordPageProps) {
  const { recordId } = await params;
  const [record, options] = await Promise.all([
    getMaintenanceRecordDetail(recordId),
    getMaintenanceFormOptions(),
  ]);

  if (!record) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Maintenance", href: "/maintenance" },
          { label: record.maintenance_type, href: `/maintenance/history/${record.id}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Correct a completed maintenance record while preserving the historical record identity."
        eyebrow="Maintenance history"
        title={`Edit ${record.maintenance_type}`}
      />
      <CompletedMaintenanceForm
        cancelHref={`/maintenance/history/${record.id}`}
        mode="edit"
        options={options}
        record={record}
      />
    </>
  );
}
