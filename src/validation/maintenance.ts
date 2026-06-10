import { z } from "zod";

export const maintenanceIntervalUnitSchema = z.enum(["days", "miles", "engine_hours"]);

export const maintenanceRuleSchema = z.object({
  ownerId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  intervalValue: z.number().positive(),
  intervalUnit: maintenanceIntervalUnitSchema,
  leadTimeDays: z.number().int().nonnegative().default(14),
  isActive: z.boolean().default(true),
});

export const completedMaintenanceSchema = z.object({
  ownerId: z.string().uuid(),
  assetId: z.string().uuid(),
  ruleId: z.string().uuid().optional(),
  completedAt: z.coerce.date(),
  odometerMiles: z.number().nonnegative().optional(),
  engineHours: z.number().nonnegative().optional(),
  vendorName: z.string().trim().max(160).optional(),
  costCents: z.number().int().nonnegative().default(0),
  notes: z.string().trim().max(1000).optional(),
});

export type MaintenanceRuleInput = z.infer<typeof maintenanceRuleSchema>;
export type CompletedMaintenanceInput = z.infer<typeof completedMaintenanceSchema>;
