import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { internalErrorMessage } from "../src/lib/action-errors";
import { AppError } from "../src/lib/errors";

vi.mock("server-only", () => ({}));

import {
  expectedActionError,
  toSafeActionError,
} from "../src/server/actions/safe-error";

describe("safe server-action error handling", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not expose unexpected internal database or storage messages", () => {
    const safeError = toSafeActionError(
      new Error('duplicate key value violates unique constraint "assets_unit_key"'),
      { action: "test.internal" },
    );

    expect(safeError).toEqual({
      code: "INTERNAL_ERROR",
      message: internalErrorMessage,
    });
    expect(safeError.message).not.toContain("duplicate key");
    expect(safeError.message).not.toContain("assets_unit_key");
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });

  it("preserves expected validation messages", () => {
    const safeError = toSafeActionError(
      expectedActionError(
        "VALIDATION_ERROR",
        "Choose an active asset from this company.",
      ),
      { action: "test.validation" },
    );

    expect(safeError).toEqual({
      code: "VALIDATION_ERROR",
      message: "Choose an active asset from this company.",
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("maps authorization and not-found errors to stable codes", () => {
    const authorization = toSafeActionError(
      new AppError(
        "AUTHORIZATION_ERROR",
        "Your subscription does not currently allow another active asset.",
      ),
      { action: "test.authorization" },
    );
    const notFound = toSafeActionError(
      expectedActionError("NOT_FOUND", "Document was not found for this owner company."),
      { action: "test.notFound" },
    );

    expect(authorization.code).toBe("AUTHORIZATION_ERROR");
    expect(authorization.message).toContain("subscription");
    expect(notFound).toEqual({
      code: "NOT_FOUND",
      message: "Document was not found for this owner company.",
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("safely handles non-Error thrown values", () => {
    const safeError = toSafeActionError("database exploded", {
      action: "test.nonError",
    });

    expect(safeError).toEqual({
      code: "INTERNAL_ERROR",
      message: internalErrorMessage,
    });
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });
});
