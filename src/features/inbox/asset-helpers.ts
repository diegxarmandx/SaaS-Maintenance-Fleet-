import type { IngestionStatus } from "@/features/inbox/types";

export const assetSections = [
  "overview",
  "maintenance",
  "compliance",
  "documents",
  "inbox",
] as const;

export type AssetSection = (typeof assetSections)[number];
export type OwnerInboxStatus = "Pending Review" | "Completed" | "Needs Attention";

export function getAssetSection(value: string | undefined): AssetSection {
  return assetSections.includes(value as AssetSection)
    ? (value as AssetSection)
    : "overview";
}

export function getOwnerInboxStatus(status: IngestionStatus): OwnerInboxStatus {
  if (status === "confirmed") {
    return "Completed";
  }

  if (status === "failed" || status === "needs_attention") {
    return "Needs Attention";
  }

  return "Pending Review";
}

export function buildAssetExtractionContext(asset: {
  id: string;
  unit_number: string;
  asset_name: string;
}) {
  return [
    `This document belongs to ${asset.asset_name} (${asset.unit_number}).`,
    "Extract maintenance date, mileage, engine hours, vendor, parts, labor, tax, total,",
    "compliance expiration date when applicable, document type, and notes.",
    "Do not attempt to match or select a different asset.",
  ].join(" ");
}

type AssetTimelineInput = {
  meterReadings: Array<{
    id: string;
    reading_type: string;
    reading_value: number;
    reading_date: string;
    notes: string | null;
  }>;
  maintenanceRecords: Array<{
    id: string;
    maintenance_type: string;
    completion_date: string;
    total_cost: number;
  }>;
  complianceRecords: Array<{
    id: string;
    compliance_type: string;
    effective_date: string | null;
    expiration_date: string;
  }>;
  documents: Array<{
    id: string;
    document_name: string;
    document_type: string;
    created_at: string;
    issue_date: string | null;
    maintenance_record_id: string | null;
    compliance_record_id: string | null;
  }>;
  completedInboxItems: Array<{
    id: string;
    title: string;
    completed_at: string;
    created_record_type: string | null;
    created_record_id: string | null;
  }>;
};

export type AssetTimelineItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
  kind: "meter" | "maintenance" | "compliance" | "document" | "inbox";
};

export function getAssetTimeline(input: AssetTimelineInput): AssetTimelineItem[] {
  const items: AssetTimelineItem[] = [];
  const linkedRecordIds = new Set<string>();

  for (const item of input.completedInboxItems) {
    if (item.created_record_id) {
      linkedRecordIds.add(item.created_record_id);
    }
  }

  for (const reading of input.meterReadings) {
    items.push({
      id: `meter:${reading.id}`,
      date: reading.reading_date,
      title:
        reading.reading_type === "mileage" ? "Mileage updated" : "Engine hours updated",
      detail: `${Number(reading.reading_value).toLocaleString()}${
        reading.reading_type === "mileage" ? " mi" : " hrs"
      }`,
      kind: "meter",
    });
  }

  for (const record of input.maintenanceRecords) {
    items.push({
      id: `maintenance:${record.id}`,
      date: record.completion_date,
      title: record.maintenance_type,
      detail: "Maintenance completed",
      kind: "maintenance",
    });
  }

  for (const record of input.complianceRecords) {
    items.push({
      id: `compliance:${record.id}`,
      date: record.effective_date ?? record.expiration_date,
      title: record.compliance_type,
      detail: "Compliance recorded",
      kind: "compliance",
    });
  }

  for (const document of input.documents) {
    const linked =
      linkedRecordIds.has(document.id) ||
      (document.maintenance_record_id &&
        linkedRecordIds.has(document.maintenance_record_id)) ||
      (document.compliance_record_id &&
        linkedRecordIds.has(document.compliance_record_id));

    if (linked || document.maintenance_record_id || document.compliance_record_id) {
      continue;
    }

    items.push({
      id: `document:${document.id}`,
      date: document.issue_date ?? document.created_at,
      title: document.document_type || document.document_name,
      detail: "Document saved",
      kind: "document",
    });
  }

  for (const item of input.completedInboxItems) {
    if (
      item.created_record_id &&
      (item.created_record_type === "maintenance_record" ||
        item.created_record_type === "compliance_record")
    ) {
      continue;
    }

    items.push({
      id: `inbox:${item.id}`,
      date: item.completed_at,
      title: item.title,
      detail: "Completed",
      kind: "inbox",
    });
  }

  return items.sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}
