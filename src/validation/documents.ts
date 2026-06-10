import { z } from "zod";

export const fleetDocumentSchema = z.object({
  ownerId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  complianceRequirementId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  storagePath: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(120),
  expiresAt: z.coerce.date().optional(),
});

export type FleetDocumentInput = z.infer<typeof fleetDocumentSchema>;
