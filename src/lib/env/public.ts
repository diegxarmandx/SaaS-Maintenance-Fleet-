import { AppError } from "@/lib/errors";
import { publicEnvSchema } from "@/lib/env/schema";

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsedPublicEnv.success) {
  throw new AppError("CONFIGURATION_ERROR", "Public environment variables are invalid.", {
    cause: parsedPublicEnv.error.flatten().fieldErrors,
  });
}

export const publicEnv = parsedPublicEnv.data;

export const isSupabasePublicConfigReady = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
