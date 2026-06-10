import { z } from "zod";

export const fleetAssetTypeSchema = z.enum(["vehicle", "trailer", "equipment"]);
export const fleetAssetStatusSchema = z.enum(["active", "inactive", "archived"]);

export const fleetAssetSchema = z.object({
  id: z.string().uuid().optional(),
  ownerId: z.string().uuid(),
  type: fleetAssetTypeSchema,
  name: z.string().trim().min(1).max(120),
  vinOrSerialNumber: z.string().trim().max(120).optional(),
  licensePlate: z.string().trim().max(32).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  status: fleetAssetStatusSchema.default("active"),
});

export type FleetAssetInput = z.infer<typeof fleetAssetSchema>;
