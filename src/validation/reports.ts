import { z } from "zod";

export const ownerReportKindSchema = z.enum([
  "maintenance_costs",
  "upcoming_maintenance",
  "compliance_expirations",
  "asset_history",
]);

export const reportFilterSchema = z.object({
  companyId: z.string().uuid(),
  kind: ownerReportKindSchema,
  assetId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
