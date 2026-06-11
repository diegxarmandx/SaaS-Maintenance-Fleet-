import {
  DOCUMENT_ALLOWED_TYPES,
  DOCUMENT_UPLOAD_MAX_SIZE_LABEL,
} from "@/features/documents/constants";

export type SupportedDocumentMimeType = (typeof DOCUMENT_ALLOWED_TYPES)[number];

export type DocumentFileValidationResult =
  | {
      ok: true;
      mimeType: SupportedDocumentMimeType;
      fileSize: number;
      safeName: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function validateDocumentFile(
  file: File,
  maxSizeBytes: number,
): Promise<DocumentFileValidationResult> {
  if (file.size <= 0) {
    return { ok: false, error: "Choose a non-empty file." };
  }

  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      error: `Documents must be ${DOCUMENT_UPLOAD_MAX_SIZE_LABEL} or smaller.`,
    };
  }

  if (!isAllowedDeclaredType(file.type)) {
    return { ok: false, error: "Upload a PDF, JPG, or PNG document." };
  }

  const detectedType = await detectDocumentMimeType(file);

  if (!detectedType) {
    return {
      ok: false,
      error: "The file contents do not match a supported PDF, JPG, or PNG document.",
    };
  }

  if (detectedType !== file.type) {
    return {
      ok: false,
      error: "The declared file type does not match the detected file contents.",
    };
  }

  return {
    ok: true,
    mimeType: detectedType,
    fileSize: file.size,
    safeName: sanitizeFilename(file.name),
  };
}

export async function detectDocumentMimeType(
  file: File,
): Promise<SupportedDocumentMimeType | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }

  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  return null;
}

export function sanitizeFilename(filename: string) {
  return (
    filename
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "document"
  );
}

export function isCompanyScopedStoragePath(path: string, companyId: string) {
  return path.split("/")[0] === companyId;
}

function isAllowedDeclaredType(value: string): value is SupportedDocumentMimeType {
  return DOCUMENT_ALLOWED_TYPES.includes(value as SupportedDocumentMimeType);
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((byte, index) => bytes[index] === byte);
}
