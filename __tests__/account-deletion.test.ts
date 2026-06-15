import { describe, expect, it } from "vitest";

import {
  activeAccountDeletionStatuses,
  getDeletionConfirmationPhrase,
  isActiveAccountDeletionStatus,
  isDeletionConfirmationValid,
  transitionAccountDeletionStatus,
} from "../src/features/account-data/deletion";

describe("account deletion workflow helpers", () => {
  it("requires exact company-name confirmation", () => {
    expect(getDeletionConfirmationPhrase(" Northstar Fleet Services LLC ")).toBe(
      "Northstar Fleet Services LLC",
    );
    expect(
      isDeletionConfirmationValid({
        confirmation: "Northstar Fleet Services LLC",
        companyName: "Northstar Fleet Services LLC",
      }),
    ).toBe(true);
    expect(
      isDeletionConfirmationValid({
        confirmation: "delete my account",
        companyName: "Northstar Fleet Services LLC",
      }),
    ).toBe(false);
  });

  it("defines active statuses used for duplicate-request protection", () => {
    expect(activeAccountDeletionStatuses).toEqual([
      "requested",
      "confirmed",
      "processing",
    ]);
    expect(isActiveAccountDeletionStatus("confirmed")).toBe(true);
    expect(isActiveAccountDeletionStatus("completed")).toBe(false);
  });

  it("allows only documented status transitions", () => {
    expect(transitionAccountDeletionStatus("requested", "confirm")).toBe("confirmed");
    expect(transitionAccountDeletionStatus("confirmed", "start_processing")).toBe(
      "processing",
    );
    expect(transitionAccountDeletionStatus("processing", "complete")).toBe(
      "completed",
    );
    expect(transitionAccountDeletionStatus("completed", "cancel")).toBeNull();
    expect(transitionAccountDeletionStatus("canceled", "retry")).toBeNull();
  });
});
