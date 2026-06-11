import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined);

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .or(z.literal(""))
  .transform((value) => value || undefined);

export const documentFormSchema = z.object({
  documentName: z
    .string()
    .trim()
    .min(1, "Enter a document name.")
    .max(160, "Keep the document name under 160 characters."),
  documentType: z
    .string()
    .trim()
    .min(1, "Choose a document category.")
    .max(120, "Keep the document category under 120 characters."),
  assetId: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  maintenanceRecordId: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  complianceRecordId: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  issueDate: optionalDate,
  expirationDate: optionalDate,
  documentNumber: optionalText(120),
  notes: optionalText(1000),
});

export type DocumentFormInput = z.infer<typeof documentFormSchema>;
