import "server-only";

import {
  internalErrorMessage,
  type SafeActionErrorCode,
  type SafeActionErrorPayload,
} from "@/lib/action-errors";
import { AppError } from "@/lib/errors";

type SafeActionErrorContext = {
  action: string;
};

export class SafeActionError extends Error {
  readonly code: SafeActionErrorCode;

  constructor(
    code: SafeActionErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "SafeActionError";
    this.code = code;
  }
}

export function expectedActionError(
  code: Exclude<SafeActionErrorCode, "INTERNAL_ERROR">,
  message: string,
  options: { cause?: unknown } = {},
) {
  return new SafeActionError(code, message, options);
}

export function toSafeActionError(
  error: unknown,
  context: SafeActionErrorContext,
): SafeActionErrorPayload {
  if (error instanceof SafeActionError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof AppError) {
    const expected = mapExpectedAppError(error);

    if (expected) {
      return expected;
    }
  }

  logServerActionError(error, context);

  return {
    code: "INTERNAL_ERROR",
    message: internalErrorMessage,
  };
}

export function formActionFailure<TFields, TErrors>(
  error: unknown,
  context: SafeActionErrorContext,
  fields: TFields,
  errors: TErrors,
) {
  const safeError = toSafeActionError(error, context);

  return {
    status: "error" as const,
    code: safeError.code,
    message: safeError.message,
    fields,
    errors,
  };
}

export function toSafeActionException(
  error: unknown,
  context: SafeActionErrorContext,
) {
  const safeError = toSafeActionError(error, context);

  return new SafeActionError(safeError.code, safeError.message, { cause: error });
}

function mapExpectedAppError(error: AppError): SafeActionErrorPayload | null {
  if (error.code === "VALIDATION_ERROR") {
    return { code: "VALIDATION_ERROR", message: error.message };
  }

  if (error.code === "AUTHENTICATION_ERROR") {
    return { code: "AUTHENTICATION_ERROR", message: error.message };
  }

  if (error.code === "AUTHORIZATION_ERROR") {
    return { code: "AUTHORIZATION_ERROR", message: error.message };
  }

  if (error.code === "RATE_LIMIT_ERROR") {
    return { code: "RATE_LIMITED", message: error.message };
  }

  return null;
}

function logServerActionError(error: unknown, context: SafeActionErrorContext) {
  console.error("Server action failed", {
    action: context.action,
    error,
  });
}
