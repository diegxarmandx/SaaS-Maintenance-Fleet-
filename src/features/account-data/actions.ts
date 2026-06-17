"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  activeAccountDeletionStatuses,
  getDeletionConfirmationPhrase,
  isDeletionConfirmationValid,
  type AccountDeletionRequestSummary,
  type AccountDeletionStatus,
} from "@/features/account-data/deletion";
import { getOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { localDemoIdentity } from "@/features/demo/local-data";
import { shouldUseLocalDemoData } from "@/features/demo/mode";
import type { SafeActionErrorCode } from "@/lib/action-errors";
import {
  checkAuthRateLimit,
  enforceOwnerTenantRateLimit,
  rateLimitedMessage,
} from "@/lib/rate-limit/server";
import { recordAuditEvent } from "@/server/audit/log";
import { formActionFailure } from "@/server/actions/safe-error";

const deletionConfirmationSchema = z.object({
  confirmation: z.string().trim().min(1, "Type the company name to continue."),
  currentPassword: z.string().optional(),
});

export type AccountDeletionActionState = {
  status: "idle" | "success" | "error";
  code?: SafeActionErrorCode | undefined;
  message: string;
  request?: AccountDeletionRequestSummary | undefined;
  errors: {
    confirmation?: string | undefined;
    currentPassword?: string | undefined;
  };
};

export async function requestAccountDeletionAction(
  _previousState: AccountDeletionActionState,
  formData: FormData,
): Promise<AccountDeletionActionState> {
  const fields = {
    confirmation: String(formData.get("confirmation") ?? ""),
    currentPassword: String(formData.get("currentPassword") ?? ""),
  };
  const parsed = deletionConfirmationSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Confirm the company name before requesting deletion.",
      errors: {
        confirmation: parsed.error.flatten().fieldErrors.confirmation?.[0],
        currentPassword: parsed.error.flatten().fieldErrors.currentPassword?.[0],
      },
    };
  }

  try {
    const context = await getOwnerDatabaseContext();

    if (!context) {
      return shouldUseLocalDemoData
        ? handleLocalDemoDeletionRequest(parsed.data.confirmation)
        : {
            status: "error",
            code: "INTERNAL_ERROR",
            message:
              "Supabase is not connected yet. Account deletion requests require a live owner account.",
            errors: {},
          };
    }

    await enforceOwnerTenantRateLimit("mutation", context);
    const passwordVerification = await verifyCurrentOwnerPassword(
      context,
      parsed.data.currentPassword ?? "",
    );

    if (!passwordVerification.ok) {
      return passwordVerification.state;
    }

    if (
      !isDeletionConfirmationValid({
        confirmation: parsed.data.confirmation,
        companyName: context.companyName,
      })
    ) {
      return {
        status: "error",
        code: "VALIDATION_ERROR",
        message: "The confirmation does not match the company name.",
        errors: {
          confirmation: `Type "${getDeletionConfirmationPhrase(context.companyName)}" exactly to continue.`,
        },
      };
    }

    const existing = await findActiveDeletionRequest(context);

    if (existing) {
      return {
        status: "success",
        message:
          "A deletion request is already recorded for this company. No duplicate request was created.",
        request: existing,
        errors: {},
      };
    }

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();
    const confirmationHash = hashConfirmation(
      context.companyId,
      parsed.data.confirmation,
    );

    const { error } = await context.supabase.from("account_deletion_requests").insert({
      id: requestId,
      company_id: context.companyId,
      owner_id: context.ownerId,
      status: "confirmed",
      requested_at: now,
      confirmed_at: now,
      confirmation_text_hash: confirmationHash,
    });

    if (error) {
      return formActionFailure(
        error,
        { action: "accountData.deletion.insert" },
        undefined,
        {},
      );
    }

    await recordAuditEvent(context, {
      eventType: "account_deletion.requested",
      entityType: "account_deletion_request",
      entityId: requestId,
      metadata: { status: "confirmed" },
    });
    await recordAuditEvent(context, {
      eventType: "account_deletion.confirmed",
      entityType: "account_deletion_request",
      entityId: requestId,
      metadata: { status: "confirmed" },
    });

    revalidatePath("/settings");

    return {
      status: "success",
      message:
        "Deletion request recorded. FleetReady has not deleted data yet; processing must be completed through the documented operations workflow.",
      request: {
        id: requestId,
        status: "confirmed",
        requestedAt: now,
        confirmedAt: now,
        completedAt: null,
        canceledAt: null,
      },
      errors: {},
    };
  } catch (error) {
    return formActionFailure(error, { action: "accountData.deletion" }, undefined, {});
  }
}

async function findActiveDeletionRequest(
  context: NonNullable<Awaited<ReturnType<typeof getOwnerDatabaseContext>>>,
): Promise<AccountDeletionRequestSummary | null> {
  const { data, error } = await context.supabase
    .from("account_deletion_requests")
    .select("id,status,requested_at,confirmed_at,completed_at,canceled_at")
    .eq("company_id", context.companyId)
    .in("status", [...activeAccountDeletionStatuses])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as {
    id: string;
    status: AccountDeletionStatus;
    requested_at: string;
    confirmed_at: string | null;
    completed_at: string | null;
    canceled_at: string | null;
  };

  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
    confirmedAt: row.confirmed_at,
    completedAt: row.completed_at,
    canceledAt: row.canceled_at,
  };
}

async function verifyCurrentOwnerPassword(
  context: NonNullable<Awaited<ReturnType<typeof getOwnerDatabaseContext>>>,
  currentPassword: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      state: AccountDeletionActionState;
    }
> {
  if (!currentPassword.trim()) {
    return {
      ok: false,
      state: {
        status: "error",
        code: "AUTHENTICATION_ERROR",
        message: "Enter your current password before requesting deletion.",
        errors: {
          currentPassword: "Current password is required for live accounts.",
        },
      },
    };
  }

  const {
    data: { user },
    error: userError,
  } = await context.supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      ok: false,
      state: {
        status: "error",
        code: "AUTHENTICATION_ERROR",
        message: "Sign in again before requesting deletion.",
        errors: {},
      },
    };
  }

  const rateLimit = await checkAuthRateLimit("login", user.email);

  if (!rateLimit.success) {
    return {
      ok: false,
      state: {
        status: "error",
        code: "RATE_LIMITED",
        message: rateLimitedMessage,
        errors: {},
      },
    };
  }

  const { error } = await context.supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (error) {
    return {
      ok: false,
      state: {
        status: "error",
        code: "AUTHENTICATION_ERROR",
        message: "Current password could not be verified.",
        errors: {
          currentPassword: "Check the password and try again.",
        },
      },
    };
  }

  return { ok: true };
}

function handleLocalDemoDeletionRequest(
  confirmation: string,
): AccountDeletionActionState {
  if (
    !isDeletionConfirmationValid({
      confirmation,
      companyName: localDemoIdentity.companyName,
    })
  ) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "The confirmation does not match the demo company name.",
      errors: {
        confirmation: `Type "${localDemoIdentity.companyName}" exactly to continue.`,
      },
    };
  }

  const now = new Date().toISOString();

  return {
    status: "success",
    message:
      "Demo deletion request simulated locally. No data was deleted because Supabase is not configured.",
    request: {
      id: "local-demo-deletion-request",
      status: "confirmed",
      requestedAt: now,
      confirmedAt: now,
      completedAt: null,
      canceledAt: null,
    },
    errors: {},
  };
}

function hashConfirmation(companyId: string, confirmation: string) {
  return createHash("sha256")
    .update(`${companyId}:${confirmation.trim()}`)
    .digest("hex");
}
