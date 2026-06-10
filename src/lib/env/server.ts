import { AppError } from "@/lib/errors";
import { serverEnvSchema } from "@/lib/env/schema";

const parsedServerEnv = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
});

if (!parsedServerEnv.success) {
  throw new AppError("CONFIGURATION_ERROR", "Server environment variables are invalid.", {
    cause: parsedServerEnv.error.flatten().fieldErrors,
  });
}

export const serverEnv = parsedServerEnv.data;

export const isSupabaseServerConfigReady = Boolean(
  serverEnv.NEXT_PUBLIC_SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY,
);
