import type { NextRequest } from "next/server";

import { buildCsv, type CsvColumn } from "@/features/reports/export";
import {
  getReportData,
  type ReportRow,
  type ReportSearchParams,
} from "@/features/reports/server/queries";
import { getOwnerDatabaseContext } from "@/features/fleet/server/owner";
import {
  checkOwnerTenantRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit/server";

type ExportType = "maintenance" | "compliance" | "documents" | "history";

const reportColumns: CsvColumn<ReportRow>[] = [
  { header: "Asset", value: (row) => row.asset },
  { header: "Item", value: (row) => row.label },
  { header: "Category", value: (row) => row.category },
  { header: "Status", value: (row) => row.status },
  { header: "Date", value: (row) => row.date },
  { header: "Amount", value: (row) => row.amount },
];

export async function GET(request: NextRequest) {
  const context = await getOwnerDatabaseContext();

  if (context) {
    const apiLimit = await checkOwnerTenantRateLimit("authenticatedApi", context);

    if (!apiLimit.success) {
      return rateLimitResponse(apiLimit);
    }

    const reportLimit = await checkOwnerTenantRateLimit("expensiveOperation", context);

    if (!reportLimit.success) {
      return rateLimitResponse(reportLimit);
    }
  }

  const type = parseExportType(request.nextUrl.searchParams.get("type"));
  const filters = Object.fromEntries(request.nextUrl.searchParams) as ReportSearchParams;
  const reports = await getReportData(filters, { skipRateLimit: Boolean(context) });
  const rows = getRowsForExport(type, reports);
  const csv = buildCsv({
    companyName: reports.companyName,
    generatedAt: new Date(),
    columns: reportColumns,
    rows,
  });

  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="fleetready-${type}-report.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function parseExportType(value: string | null): ExportType {
  if (
    value === "maintenance" ||
    value === "compliance" ||
    value === "documents" ||
    value === "history"
  ) {
    return value;
  }

  return "history";
}

function getRowsForExport(
  type: ExportType,
  reports: Awaited<ReturnType<typeof getReportData>>,
) {
  if (type === "maintenance") {
    return [
      ...reports.overdueMaintenance,
      ...reports.upcomingMaintenance,
      ...reports.completedMaintenance,
    ];
  }

  if (type === "compliance") {
    return [
      ...reports.expiredCompliance,
      ...reports.missingRequirements,
      ...reports.expiringCompliance,
      ...reports.complianceStatus.filter(
        (row) =>
          row.status !== "Expired" &&
          row.status !== "Missing" &&
          row.status !== "Expiring soon",
      ),
    ];
  }

  if (type === "documents") {
    return [
      ...reports.expiredDocuments,
      ...reports.expiringDocuments,
      ...reports.documents.filter(
        (row) => row.status !== "Expired" && row.status !== "Expiring soon",
      ),
    ];
  }

  return reports.assetHistory;
}
