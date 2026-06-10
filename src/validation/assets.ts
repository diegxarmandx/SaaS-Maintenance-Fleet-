import { z } from "zod";

export const fleetAssetTypeSchema = z.enum(["vehicle", "trailer", "equipment"]);
export const fleetAssetStatusSchema = z.enum(["active", "inactive", "archived"]);

export const fleetAssetSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  type: fleetAssetTypeSchema,
  unitNumber: z.string().trim().min(1).max(80),
  assetName: z.string().trim().min(1).max(120),
  vinOrSerialNumber: z.string().trim().max(120).optional(),
  licensePlate: z.string().trim().max(32).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  currentMileage: z.number().nonnegative().default(0),
  currentEngineHours: z.number().nonnegative().default(0),
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  status: fleetAssetStatusSchema.default("active"),
  notes: z.string().trim().max(2000).optional(),
  assetImagePath: z.string().trim().max(500).optional(),
});

export type FleetAssetInput = z.infer<typeof fleetAssetSchema>;
