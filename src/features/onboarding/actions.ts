"use server";

import { redirect } from "next/navigation";

import {
  companyOnboardingSchema,
  type CompanyOnboardingValues,
} from "@/features/onboarding/validation/onboarding";
import { getErrorMessage } from "@/lib/errors";
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
