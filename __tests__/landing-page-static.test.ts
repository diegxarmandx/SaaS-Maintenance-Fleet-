import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingPageSource = readFileSync(
  new URL("../src/app/page.tsx", import.meta.url),
  "utf8",
);

describe("public landing page", () => {
  it("routes landing authentication calls to the existing auth pages", () => {
    expect(landingPageSource).toContain('href="/login"');
    expect(landingPageSource).toContain('href="/signup"');
    expect(landingPageSource).toContain("legalLinks.map");
    expect(landingPageSource).not.toContain('href="/dashboard"');
  });

  it("markets the owner-only fleet maintenance scope", () => {
    expect(landingPageSource).toContain("Preventive maintenance");
    expect(landingPageSource).toContain("Service reminders");
    expect(landingPageSource).toContain("Repair and expense records");
    expect(landingPageSource).toContain("Vehicle history");
    expect(landingPageSource).toContain("Fleet overview");
  });
});
