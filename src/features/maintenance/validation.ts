import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(max).optional());

const optionalPositiveNumber = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().positive("Enter a value greater than zero.").optional(),
);

const optionalNonnegativeNumber = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().nonnegative("Enter a nonnegative value.").optional(),
);

const requiredNonnegativeNumber = z.preprocess(
  (value) => (value === "" || value === null || typeof value === "undefined" ? 0 : value),
  z.coerce.number().nonnegative("Enter a nonnegative value."),
);

const optionalPositiveInteger = z.preprocess(
  emptyStringToUndefined,
  z.coerce
    .number()
    .int("Enter a whole number.")
    .positive("Enter a value above zero.")
    .optional(),
);

const requiredNonnegativeInteger = z.preprocess(
  (value) =>
    value === "" || value === null || typeof value === "undefined" ? 14 : value,
  z.coerce.number().int("Enter a whole number.").nonnegative("Enter zero or more days."),
);

const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .optional(),
);

const requiredDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalUuid = z.preprocess(
  emptyStringToUndefined,
  z.string().uuid("Choose a valid record.").optional(),
);

export const maintenanceRuleFormSchema = z
  .object({
    assetId: z.string().uuid("Choose an asset."),
    templateId: optionalUuid,
    name: z.string().trim().min(1, "Enter a maintenance type.").max(120),
    description: optionalText(1000),
    mileageInterval: optionalPositiveNumber,
    hourInterval: optionalPositiveNumber,
    calendarIntervalDays: optionalPositiveInteger,
    lastCompletedDate: optionalDate,
    lastCompletedMileage: optionalNonnegativeNumber,
    lastCompletedHours: optionalNonnegativeNumber,
    reminderMileage: optionalNonnegativeNumber,
    reminderHours: optionalNonnegativeNumber,
    reminderDays: requiredNonnegativeInteger,
    isActive: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  })
  .refine(
    (value) =>
      Boolean(value.mileageInterval || value.hourInterval || value.calendarIntervalDays),
    {
      message: "Enable at least one mileage, hour, or calendar interval.",
      path: ["mileageInterval"],
    },
  );

export const completedMaintenanceFormSchema = z.object({
  assetId: z.string().uuid("Choose an asset."),
  maintenanceRuleId: optionalUuid,
  maintenanceType: z.string().trim().min(1, "Enter a maintenance type.").max(140),
  completionDate: requiredDate,
  mileage: optionalNonnegativeNumber,
  engineHours: optionalNonnegativeNumber,
  serviceProvider: optionalText(160),
  partsCost: requiredNonnegativeNumber,
  laborCost: requiredNonnegativeNumber,
  otherCost: requiredNonnegativeNumber,
  notes: optionalText(1000),
});

export type MaintenanceRuleFormValues = z.infer<typeof maintenanceRuleFormSchema>;
export type CompletedMaintenanceFormValues = z.infer<
  typeof completedMaintenanceFormSchema
>;
