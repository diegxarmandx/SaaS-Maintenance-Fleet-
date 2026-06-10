import { z } from "zod";

export const notificationSchema = z.object({
  companyId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  notificationType: z.enum([
    "maintenance_due",
    "compliance_expiration",
    "document_expiration",
    "general",
  ]),
  relatedEntityType: z.string().trim().min(1).max(80),
  relatedEntityId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(1000),
  dueDate: z.coerce.date().optional(),
  readAt: z.coerce.date().optional(),
  emailDeliveryStatus: z
    .enum(["not_queued", "queued", "sent", "failed", "skipped"])
    .default("not_queued"),
});

export type NotificationInput = z.infer<typeof notificationSchema>;
