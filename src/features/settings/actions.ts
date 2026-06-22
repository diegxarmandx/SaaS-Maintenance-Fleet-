"use server";

import { revalidatePath } from "next/cache";

import { shouldUseLocalDemoData } from "@/features/demo/mode";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import {
  buildCompanyProfileUpdatePayload,
  buildWorkspacePreferencesUpdatePayload,
  getCompanyProfileFieldsFromFormData,
  getOwnerProfileFieldsFromFormData,
  getWorkspacePreferencesFieldsFromFormData,
} from "@/features/settings/helpers";
import type {
  CompanyProfileFormState,
  OwnerProfileFormState,
  WorkspacePreferencesFormState,
} from "@/features/settings/types";
import {
  companyProfileSchema,
  ownerProfileSchema,
  workspacePreferencesSchema,
} from "@/features/settings/validation";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";
import { expectedActionError, formActionFailure } from "@/server/actions/safe-error";

export async function updateCompanyProfileAction(
  _previousState: CompanyProfileFormState,
  formData: FormData,
): Promise<CompanyProfileFormState> {
  const fields = getCompanyProfileFieldsFromFormData(formData);
  const parsed = companyProfileSchema.safeParse(fields);

  if (!parsed.success) {
    return validationFailure(
      fields,
      parsed.error.flatten().fieldErrors,
      "Review the highlighted company fields.",
    );
  }

  const savedFields = {
    companyName: parsed.data.companyName,
    companyEmail: parsed.data.companyEmail,
    phone: parsed.data.phone,
    address: parsed.data.address,
  };

  if (shouldUseLocalDemoData) {
    return successState(savedFields, "Company profile saved.");
  }

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const { data, error } = await context.supabase
      .from("companies")
      .update(buildCompanyProfileUpdatePayload(parsed.data))
      .eq("id", context.companyId)
      .select("id")
      .maybeSingle();

    if (error) {
      return formActionFailure(
        error,
        { action: "settings.updateCompanyProfile" },
        savedFields,
        {},
      );
    }

    if (!data) {
      return formActionFailure(
        expectedActionError(
          "AUTHORIZATION_ERROR",
          "You do not have access to update this company.",
        ),
        { action: "settings.updateCompanyProfile.authorization" },
        savedFields,
        {},
      );
    }
  } catch (error) {
    return formActionFailure(
      error,
      { action: "settings.updateCompanyProfile" },
      savedFields,
      {},
    );
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return successState(savedFields, "Company profile saved.");
}

export async function updateOwnerProfileAction(
  _previousState: OwnerProfileFormState,
  formData: FormData,
): Promise<OwnerProfileFormState> {
  const fields = getOwnerProfileFieldsFromFormData(formData);
  const parsed = ownerProfileSchema.safeParse(fields);

  if (!parsed.success) {
    return validationFailure(
      fields,
      parsed.error.flatten().fieldErrors,
      "Review the highlighted owner fields.",
    );
  }

  const savedFields = { fullName: parsed.data.fullName };

  if (shouldUseLocalDemoData) {
    return successState(savedFields, "Owner profile saved.");
  }

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const { error } = await context.supabase.rpc("update_owner_profile_name", {
      p_full_name: parsed.data.fullName,
    });

    if (error) {
      return formActionFailure(
        error,
        { action: "settings.updateOwnerProfile" },
        savedFields,
        {},
      );
    }
  } catch (error) {
    return formActionFailure(
      error,
      { action: "settings.updateOwnerProfile" },
      savedFields,
      {},
    );
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return successState(savedFields, "Owner profile saved.");
}

export async function updateWorkspacePreferencesAction(
  _previousState: WorkspacePreferencesFormState,
  formData: FormData,
): Promise<WorkspacePreferencesFormState> {
  const fields = getWorkspacePreferencesFieldsFromFormData(formData);
  const parsed = workspacePreferencesSchema.safeParse(fields);

  if (!parsed.success) {
    return validationFailure(
      fields,
      parsed.error.flatten().fieldErrors,
      "Review the highlighted workspace preferences.",
    );
  }

  const savedFields = {
    preferredTimezone: parsed.data.preferredTimezone,
    distanceUnit: parsed.data.distanceUnit,
    engineHourTracking: parsed.data.engineHourTracking,
  };

  if (shouldUseLocalDemoData) {
    return successState(savedFields, "Workspace preferences saved.");
  }

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const { data, error } = await context.supabase
      .from("companies")
      .update(buildWorkspacePreferencesUpdatePayload(parsed.data))
      .eq("id", context.companyId)
      .select("id")
      .maybeSingle();

    if (error) {
      return formActionFailure(
        error,
        { action: "settings.updateWorkspacePreferences" },
        savedFields,
        {},
      );
    }

    if (!data) {
      return formActionFailure(
        expectedActionError(
          "AUTHORIZATION_ERROR",
          "You do not have access to update these preferences.",
        ),
        { action: "settings.updateWorkspacePreferences.authorization" },
        savedFields,
        {},
      );
    }
  } catch (error) {
    return formActionFailure(
      error,
      { action: "settings.updateWorkspacePreferences" },
      savedFields,
      {},
    );
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return successState(savedFields, "Workspace preferences saved.");
}

function validationFailure<TFields extends object>(
  fields: TFields,
  fieldErrors: Partial<Record<keyof TFields, string[] | undefined>>,
  message: string,
) {
  const errors: Partial<Record<keyof TFields, string>> = {};

  for (const [key, messages] of Object.entries(fieldErrors) as Array<
    [keyof TFields, string[] | undefined]
  >) {
    errors[key] = messages?.[0] ?? "";
  }

  return {
    status: "error" as const,
    code: "VALIDATION_ERROR" as const,
    message,
    fields,
    errors,
  };
}

function successState<TFields extends object>(fields: TFields, message: string) {
  return {
    status: "success" as const,
    message,
    fields,
    errors: {},
  };
}
