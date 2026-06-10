import { z } from "zod";

export const fleetDocumentSchema = z.object({
  companyId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  maintenanceRecordId: z.string().uuid().optional(),
  complianceRecordId: z.string().uuid().optional(),
  documentName: z.string().trim().min(1).max(160),
  category: z.enum(["asset", "maintenance", "compliance", "general"]),
  storagePath: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().nonnegative(),
  issueDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  documentNumber: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type FleetDocumentInput = z.infer<typeof fleetDocumentSchema>;
