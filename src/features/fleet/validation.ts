import { z } from "zod";

import { ASSET_STATUS_OPTIONS, DEFAULT_ASSET_TYPES } from "@/features/fleet/constants";

const emptyStringToUndefined = (value: unknown) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return value;
};

const optionalTrimmedString = (max: number) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(max).optional());

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const optionalNumber = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().nonnegative("Enter a nonnegative number.").optional(),
);

const requiredNonnegativeNumber = z.preprocess(
  (value) => (value === "" || value === null || typeof value === "undefined" ? 0 : value),
  z.coerce.number().nonnegative("Enter a nonnegative number."),
);

const optionalYear = z.preprocess(
  emptyStringToUndefined,
  z.coerce
    .number()
    .int("Enter a whole year.")
    .min(1900, "Year must be 1900 or later.")
    .max(2100, "Year must be 2100 or earlier.")
    .optional(),
);

const optionalIsoDate = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .optional(),
);

const assetStatusValues = ASSET_STATUS_OPTIONS.map((option) => option.value) as [
  "active",
  "inactive",
  "archived",
];

export const assetFormSchema = z.object({
  unitNumber: requiredText("Unit number", 80),
  assetName: requiredText("Asset name", 120),
  assetType: requiredText("Asset type", 80),
  year: optionalYear,
  make: optionalTrimmedString(80),
  model: optionalTrimmedString(80),
  vinOrSerialNumber: optionalTrimmedString(120),
  licensePlate: optionalTrimmedString(32),
  currentMileage: requiredNonnegativeNumber,
  currentEngineHours: requiredNonnegativeNumber,
  purchaseDate: optionalIsoDate,
  purchasePrice: optionalNumber,
  status: z.enum(assetStatusValues),
  notes: optionalTrimmedString(2000),
});

export const assetTypeOptionsSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      DEFAULT_ASSET_TYPES.includes(value as (typeof DEFAULT_ASSET_TYPES)[number]),
    "Use a supported default asset type or enter a custom type later.",
  );

export const meterReadingFormSchema = z.object({
  readingType: z.enum(["mileage", "engine_hours"]),
  readingValue: requiredNonnegativeNumber,
  readingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the reading date."),
  notes: optionalTrimmedString(1000),
  isCorrection: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;
export type MeterReadingFormValues = z.infer<typeof meterReadingFormSchema>;
