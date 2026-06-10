"use client";

import { createClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";
import { publicEnv } from "@/lib/env/public";

export function createBrowserSupabaseClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Supabase browser configuration is missing.",
    );
  }

  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}
