import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fleetListSource = readFileSync(
  new URL("../src/features/fleet/components/fleet-list-page.tsx", import.meta.url),
  "utf8",
);

describe("fleet responsive UI structure", () => {
  it("uses a desktop table and mobile card list", () => {
    expect(fleetListSource).toContain("hidden md:block");
    expect(fleetListSource).toContain("md:hidden");
    expect(fleetListSource).toContain("MobileCardList");
    expect(fleetListSource).toContain("DataTable");
  });

  it("renders status badges with text instead of color-only status", () => {
    expect(fleetListSource).toContain("StatusBadge");
    expect(fleetListSource).toContain("attentionStatus");
  });
});
