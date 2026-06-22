import { redirect } from "next/navigation";

import { AppError } from "@/lib/errors";
import { isSupabasePublicConfigReady } from "@/lib/env/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type OwnerDatabaseContext = {
  supabase: SupabaseServerClient;
  ownerId: string;
  companyId: string;
  companyName: string;
  preferredTimezone: string;
};

export async function getOwnerDatabaseContext(): Promise<OwnerDatabaseContext | null> {
  if (!isSupabasePublicConfigReady) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id,onboarding_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AppError("DATA_ACCESS_ERROR", profileError.message);
  }

  if (!profile?.company_id || profile.onboarding_status !== "complete") {
    redirect("/onboarding");
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("company_name,preferred_timezone")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (companyError) {
    throw new AppError("DATA_ACCESS_ERROR", companyError.message);
  }

  return {
    supabase,
    ownerId: user.id,
    companyId: profile.company_id,
    companyName: company?.company_name ?? "Maintly workspace",
    preferredTimezone: company?.preferred_timezone ?? "UTC",
  };
}

export async function requireOwnerDatabaseContext(): Promise<OwnerDatabaseContext> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Supabase is not configured for fleet asset storage yet.",
    );
  }

  return context;
}
