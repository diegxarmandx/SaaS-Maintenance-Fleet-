import { isSupabasePublicConfigReady } from "@/lib/env/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localDemoIdentity } from "@/features/demo/local-data";
import { shouldUseLocalDemoData } from "@/features/demo/mode";

export type OwnerWorkspaceContext = {
  isConfigured: boolean;
  ownerName: string;
  ownerEmail: string | null;
  companyId: string | null;
  companyName: string;
};

const fallbackOwnerContext: OwnerWorkspaceContext = {
  isConfigured: false,
  ownerName: "Fleet owner",
  ownerEmail: null,
  companyId: null,
  companyName: "Maintly workspace",
};

const localDemoOwnerContext: OwnerWorkspaceContext = {
  isConfigured: true,
  ownerName: localDemoIdentity.ownerName,
  ownerEmail: localDemoIdentity.ownerEmail,
  companyId: localDemoIdentity.companyId,
  companyName: localDemoIdentity.companyName,
};

export async function getOwnerWorkspaceContext(): Promise<OwnerWorkspaceContext> {
  if (!isSupabasePublicConfigReady) {
    return shouldUseLocalDemoData ? localDemoOwnerContext : fallbackOwnerContext;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fallbackOwnerContext;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,email,company_id,onboarding_status")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.company_id || profile.onboarding_status !== "complete") {
      return {
        ...fallbackOwnerContext,
        isConfigured: true,
        ownerName: profile?.full_name || user.email || "Fleet owner",
        ownerEmail: profile?.email ?? user.email ?? null,
      };
    }

    const { data: company } = await supabase
      .from("companies")
      .select("company_name")
      .eq("id", profile.company_id)
      .maybeSingle();

    return {
      isConfigured: true,
      ownerName: profile.full_name || user.email || "Fleet owner",
      ownerEmail: profile.email ?? user.email ?? null,
      companyId: profile.company_id,
      companyName: company?.company_name ?? "Maintly workspace",
    };
  } catch {
    return fallbackOwnerContext;
  }
}
