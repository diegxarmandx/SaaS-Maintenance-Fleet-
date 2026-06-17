import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overviewSource = readFileSync(
  new URL(
    "../src/features/maintenance/components/maintenance-overview-page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const assetProfileSource = readFileSync(
  new URL("../src/features/fleet/components/asset-profile-page.tsx", import.meta.url),
  "utf8",
);

describe("maintenance responsive UI structure", () => {
  it("uses desktop tables and mobile cards for rules and history", () => {
    expect(overviewSource).toContain("hidden min-w-0 md:block");
    expect(overviewSource).toContain("md:hidden");
    expect(overviewSource).toContain("MobileCardList");
    expect(overviewSource).toContain("DataTable");
  });

  it("uses status badges with semantic status text", () => {
    expect(overviewSource).toContain("StatusBadge");
    expect(overviewSource).toContain("Current");
    expect(overviewSource).toContain("Due soon");
    expect(overviewSource).toContain("Overdue");
  });

  it("integrates maintenance context into asset profiles", () => {
    expect(assetProfileSource).toContain("Maintenance status");
    expect(assetProfileSource).toContain("Recent completed maintenance");
    expect(assetProfileSource).toContain("nextDueItems");
  });
});
