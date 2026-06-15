export type AppErrorCode =
  | "CONFIGURATION_ERROR"
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "DATA_ACCESS_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "UNKNOWN_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;

  constructor(
    code: AppErrorCode,
    message: string,
    options: { statusCode?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.statusCode = options.statusCode ?? 500;
  }
}

export function toAppError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred.",
) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError("UNKNOWN_ERROR", error.message || fallbackMessage, {
      cause: error,
    });
  }

  return new AppError("UNKNOWN_ERROR", fallbackMessage, { cause: error });
}

export function getErrorMessage(
  error: unknown,
  fallbackMessage = "Something went wrong.",
) {
  return toAppError(error, fallbackMessage).message;
}
