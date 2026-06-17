import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().url().optional(),
);

const optionalBooleanFlag = z.preprocess(
  emptyStringToUndefined,
  z.enum(["0", "1", "false", "true"]).optional(),
);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
});

export const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ENABLE_LOCAL_DEMO: optionalBooleanFlag,
  FLEETREADY_PLAYWRIGHT: optionalBooleanFlag,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_STORAGE_BUCKET: z
    .preprocess(emptyStringToUndefined, z.string().trim().min(1).optional())
    .default("fleet-documents"),
  SUPABASE_ASSET_IMAGES_BUCKET: z
    .preprocess(emptyStringToUndefined, z.string().trim().min(1).optional())
    .default("asset-images"),
  SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET: z
    .preprocess(emptyStringToUndefined, z.string().trim().min(1).optional())
    .default("maintenance-attachments"),
  SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET: z
    .preprocess(emptyStringToUndefined, z.string().trim().min(1).optional())
    .default("compliance-documents"),
  DOCUMENT_UPLOAD_MAX_SIZE_BYTES: z
    .preprocess(
      emptyStringToUndefined,
      z.coerce
        .number()
        .int()
        .min(1)
        .max(10 * 1024 * 1024)
        .optional(),
    )
    .default(10 * 1024 * 1024),
  CRON_SECRET: optionalString,
  EMAIL_PROVIDER: z.enum(["none", "resend"]).default("none"),
  EMAIL_FROM: z.preprocess(emptyStringToUndefined, z.string().trim().email().optional()),
  SUPPORT_EMAIL: z.preprocess(emptyStringToUndefined, z.string().trim().email().optional()),
  RESEND_API_KEY: optionalString,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  RATE_LIMIT_KEY_SALT: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_STARTER_PRICE_ID: optionalString,
  STRIPE_SMALL_FLEET_PRICE_ID: optionalString,
  STRIPE_GROWING_FLEET_PRICE_ID: optionalString,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
