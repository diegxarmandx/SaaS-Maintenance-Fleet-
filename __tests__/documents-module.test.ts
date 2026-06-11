import { describe, expect, it } from "vitest";

import {
  isCompanyScopedStoragePath,
  sanitizeFilename,
  validateDocumentFile,
} from "../src/features/documents/file-validation";
import {
  buildDocumentMetadataPayload,
  resolveDocumentCategory,
} from "../src/features/documents/helpers";
import { documentFormSchema } from "../src/features/documents/validation";

const companyId = "11111111-1111-4111-8111-111111111111";

describe("document library helpers", () => {
  it("validates declared and detected PDF content", async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "doc.pdf", {
      type: "application/pdf",
    });

    const result = await validateDocumentFile(file, 1024);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe("application/pdf");
    }
  });

  it("rejects files whose declared MIME type does not match detected bytes", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "doc.pdf", {
      type: "application/pdf",
    });

    const result = await validateDocumentFile(file, 1024);

    expect(result.ok).toBe(false);
  });

  it("sanitizes filenames and checks company-scoped storage paths", () => {
    expect(sanitizeFilename("Owner's Registration 2026!.PDF")).toBe(
      "owner-s-registration-2026-.pdf",
    );
    expect(isCompanyScopedStoragePath(`${companyId}/documents/file.pdf`, companyId)).toBe(
      true,
    );
    expect(
      isCompanyScopedStoragePath(
        `22222222-2222-4222-8222-222222222222/documents/file.pdf`,
        companyId,
      ),
    ).toBe(false);
  });

  it("maps document categories from relationships and document types", () => {
    expect(resolveDocumentCategory({ documentType: "Insurance" })).toBe("compliance");
    expect(resolveDocumentCategory({ documentType: "Maintenance receipt" })).toBe(
      "maintenance",
    );
    expect(
      resolveDocumentCategory({
        documentType: "Other",
        maintenanceRecordId: "88888888-8888-4888-8888-888888888881",
      }),
    ).toBe("maintenance");
    expect(resolveDocumentCategory({ documentType: "Title", assetId: "asset" })).toBe(
      "asset",
    );
  });

  it("builds document metadata without exposing storage credentials", () => {
    const input = documentFormSchema.parse({
      documentName: "Insurance certificate",
      documentType: "Insurance",
      assetId: "22222222-2222-4222-8222-222222222222",
      maintenanceRecordId: "",
      complianceRecordId: "",
      issueDate: "2026-01-01",
      expirationDate: "2026-12-31",
      documentNumber: "POL-1",
      notes: "",
    });

    const payload = buildDocumentMetadataPayload(companyId, input, {
      storageBucket: "compliance-documents",
      storagePath: `${companyId}/compliance/document.pdf`,
      mimeType: "application/pdf",
      fileSize: 500,
    });

    expect(payload.company_id).toBe(companyId);
    expect(payload.category).toBe("compliance");
    expect(payload.storage_bucket).toBe("compliance-documents");
    expect(Object.keys(payload)).not.toContain("serviceRoleKey");
  });
});
