export const safeActionErrorCodes = [
  "VALIDATION_ERROR",
  "AUTHENTICATION_ERROR",
  "AUTHORIZATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "FILE_TOO_LARGE",
  "INVALID_FILE",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type SafeActionErrorCode = (typeof safeActionErrorCodes)[number];

export type SafeActionErrorPayload = {
  code: SafeActionErrorCode;
  message: string;
};

export const internalErrorMessage = "Something went wrong. Please try again.";
