import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const complianceOverview = readFileSync(
  new URL(
    "../src/features/compliance/components/compliance-overview-page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const documentLibrary = readFileSync(
  new URL(
    "../src/features/documents/components/document-library-page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const documentDetail = readFileSync(
  new URL("../src/app/(owner)/documents/[documentId]/page.tsx", import.meta.url),
  "utf8",
);

describe("compliance and documents UI structure", () => {
  it("renders compliance desktop tables, mobile cards, filters, and missing status actions", () => {
    expect(complianceOverview).toContain("DataTable");
    expect(complianceOverview).toContain("MobileCardList");
    expect(complianceOverview).toContain("Assign requirement");
    expect(complianceOverview).toContain("Missing");
    expect(complianceOverview).toContain("Add record");
  });

  it("renders document library search, filters, expiring and archived views", () => {
    expect(documentLibrary).toContain("Expiring documents");
    expect(documentLibrary).toContain("Archived documents");
    expect(documentLibrary).toContain("DataTable");
    expect(documentLibrary).toContain("MobileCardList");
    expect(documentLibrary).toContain("DOCUMENT_STATUS_FILTERS");
  });

  it("renders secure document preview and download surfaces", () => {
    expect(documentDetail).toContain("<object");
    expect(documentDetail).toContain("Secure download");
    expect(documentDetail).toContain("archiveFleetDocumentAction");
  });
});
