import { describe, expect, it } from "vitest";

import { buildCsv, escapeCsvValue } from "../src/features/reports/export";
import { parseReportFilters } from "../src/features/reports/server/queries";

describe("report exports", () => {
  it("escapes CSV values and prevents spreadsheet formula execution", () => {
    expect(escapeCsvValue("=SUM(1,1)")).toBe('"\'=SUM(1,1)"');
    expect(escapeCsvValue("+cmd")).toBe("'+cmd");
    expect(escapeCsvValue("normal value")).toBe("normal value");
    expect(escapeCsvValue('quoted "value"')).toBe('"quoted ""value"""');
  });

  it("includes company and generated date metadata in CSV exports", () => {
    const csv = buildCsv({
      companyName: "Acme Fleet",
      generatedAt: new Date("2026-06-11T12:00:00.000Z"),
      columns: [{ header: "Asset", value: (row: { asset: string }) => row.asset }],
      rows: [{ asset: "Unit 01" }],
    });

    expect(csv).toContain("Company,Acme Fleet");
    expect(csv).toContain("Generated at,2026-06-11T12:00:00.000Z");
    expect(csv).toContain("Asset\nUnit 01");
  });

  it("normalizes report filters from search parameters", () => {
    expect(
      parseReportFilters({
        assetId: ["asset-1", "asset-2"],
        from: "2026-01-01",
        to: "2026-06-30",
      }),
    ).toEqual({
      assetId: "asset-1",
      from: "2026-01-01",
      to: "2026-06-30",
    });
  });
});
