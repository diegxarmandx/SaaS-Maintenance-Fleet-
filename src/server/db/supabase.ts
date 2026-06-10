import { createClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";

export function createSupabaseServiceClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = serverEnv;

  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Supabase service configuration is missing.",
    );
  }

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
