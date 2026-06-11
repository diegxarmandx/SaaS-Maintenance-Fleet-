import { describe, expect, it } from "vitest";

import { getDashboardAttentionRank } from "../src/features/dashboard/priority";

describe("dashboard attention priority", () => {
  it("prioritizes expired and overdue items before missing and due-soon items", () => {
    const statuses = ["Expiring soon", "Missing", "Overdue", "Due soon", "Expired"];

    expect(
      statuses.sort(
        (left, right) =>
          getDashboardAttentionRank(left) - getDashboardAttentionRank(right),
      ),
    ).toEqual(["Overdue", "Expired", "Missing", "Expiring soon", "Due soon"]);
  });
});
