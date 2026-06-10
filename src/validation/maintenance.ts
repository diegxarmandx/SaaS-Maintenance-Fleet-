import { z } from "zod";

export const maintenanceIntervalUnitSchema = z.enum(["days", "miles", "engine_hours"]);

export const maintenanceRuleSchema = z.object({
  companyId: z.string().uuid(),
  assetId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  mileageInterval: z.number().positive().optional(),
  hourInterval: z.number().positive().optional(),
  calendarIntervalDays: z.number().int().positive().optional(),
  reminderMileage: z.number().nonnegative().optional(),
  reminderHours: z.number().nonnegative().optional(),
  reminderDays: z.number().int().nonnegative().default(14),
  isActive: z.boolean().default(true),
});

export const completedMaintenanceSchema = z.object({
  companyId: z.string().uuid(),
  assetId: z.string().uuid(),
  maintenanceRuleId: z.string().uuid().optional(),
  maintenanceType: z.string().trim().min(1).max(140),
  completionDate: z.coerce.date(),
  mileage: z.number().nonnegative().optional(),
  engineHours: z.number().nonnegative().optional(),
  serviceProvider: z.string().trim().max(160).optional(),
  partsCost: z.number().nonnegative().default(0),
  laborCost: z.number().nonnegative().default(0),
  otherCost: z.number().nonnegative().default(0),
  notes: z.string().trim().max(1000).optional(),
});

export type MaintenanceRuleInput = z.infer<typeof maintenanceRuleSchema>;
export type CompletedMaintenanceInput = z.infer<typeof completedMaintenanceSchema>;
