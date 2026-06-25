"use server";

import { redirect } from "next/navigation";

import {
  companyOnboardingSchema,
  type CompanyOnboardingValues,
} from "@/features/onboarding/validation/onboarding";
import { isSubscriptionPlanKey } from "@/features/billing/plans";
import type { SafeActionErrorCode } from "@/lib/action-errors";
import { enforceOwnerUserRateLimit } from "@/lib/rate-limit/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  expectedActionError,
  toSafeActionError,
} from "@/server/actions/safe-error";

export type OnboardingActionResult = {
  status: "error";
  code?: SafeActionErrorCode;
  message: string;
};

export async function completeOnboardingAction(
  values: CompanyOnboardingValues,
  selectedPlanKey?: string | null,
): Promise<OnboardingActionResult> {
  const parsed = companyOnboardingSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Complete the company onboarding fields.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const safeError = toSafeActionError(
        expectedActionError(
          "AUTHENTICATION_ERROR",
          "Sign in again to finish onboarding.",
          { cause: userError },
        ),
        { action: "onboarding.currentUser" },
      );

      return { status: "error", ...safeError };
    }

    await enforceOwnerUserRateLimit("mutation", user.id);

    const planKey = isSubscriptionPlanKey(selectedPlanKey) ? selectedPlanKey : "free";

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
      p_plan_key: planKey,
    });

    if (error) {
      const safeError = toSafeActionError(error, {
        action: "onboarding.completeCompany",
      });

      return { status: "error", ...safeError };
    }
  } catch (error) {
    const safeError = toSafeActionError(error, { action: "onboarding.complete" });

    return { status: "error", ...safeError };
  }

  if (isSubscriptionPlanKey(selectedPlanKey)) {
    redirect(
      `/settings?plan=${encodeURIComponent(selectedPlanKey)}#subscription`,
    );
  }

  redirect("/dashboard");
}
