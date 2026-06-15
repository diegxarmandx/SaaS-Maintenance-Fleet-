"use server";

import { redirect } from "next/navigation";

import {
  companyOnboardingSchema,
  type CompanyOnboardingValues,
} from "@/features/onboarding/validation/onboarding";
import { getErrorMessage } from "@/lib/errors";
import { enforceOwnerUserRateLimit } from "@/lib/rate-limit/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OnboardingActionResult = {
  status: "error";
  message: string;
};

export async function completeOnboardingAction(
  values: CompanyOnboardingValues,
): Promise<OnboardingActionResult> {
  const parsed = companyOnboardingSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: "Complete the company onboarding fields." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "error", message: "Sign in again to finish onboarding." };
    }

    await enforceOwnerUserRateLimit("mutation", user.id);

    const { error } = await supabase.rpc("complete_company_onboarding", {
      p_company_name: parsed.data.companyName,
      p_owner_name: parsed.data.ownerName,
      p_phone: parsed.data.phone,
      p_email: parsed.data.email,
      p_address: parsed.data.address,
      p_preferred_timezone: parsed.data.preferredTimezone,
      p_preferred_measurement_settings: {
        distanceUnit: parsed.data.distanceUnit,
        engineHourTracking: parsed.data.engineHourTracking,
      },
    });

    if (error) {
      return { status: "error", message: error.message };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) };
  }

  redirect("/dashboard");
}
