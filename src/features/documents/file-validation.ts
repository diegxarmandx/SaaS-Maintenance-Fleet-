import {
  DOCUMENT_ALLOWED_TYPES,
  DOCUMENT_UPLOAD_MAX_SIZE_LABEL,
} from "@/features/documents/constants";
import type { SafeActionErrorCode } from "@/lib/action-errors";

export type SupportedDocumentMimeType = (typeof DOCUMENT_ALLOWED_TYPES)[number];
export type SupportedUploadMimeType = SupportedDocumentMimeType | "image/webp";

type UploadFileValidationOptions = {
  allowedTypes: readonly SupportedUploadMimeType[];
  maxSizeBytes: number;
  maxSizeLabel: string;
  allowedTypeLabel: string;
};

export type DocumentFileValidationResult =
  | {
      ok: true;
      mimeType: SupportedUploadMimeType;
      fileSize: number;
      safeName: string;
    }
  | {
      ok: false;
      code: Extract<SafeActionErrorCode, "VALIDATION_ERROR" | "FILE_TOO_LARGE" | "INVALID_FILE">;
      error: string;
    };

export async function validateDocumentFile(
  file: File,
  maxSizeBytes: number,
): Promise<DocumentFileValidationResult> {
  return validateUploadFile(file, {
    allowedTypes: DOCUMENT_ALLOWED_TYPES,
    maxSizeBytes,
    maxSizeLabel: DOCUMENT_UPLOAD_MAX_SIZE_LABEL,
    allowedTypeLabel: "PDF, JPG, or PNG document",
  });
}

export async function validateUploadFile(
  file: File,
  options: UploadFileValidationOptions,
): Promise<DocumentFileValidationResult> {
  if (file.size <= 0) {
    return { ok: false, code: "INVALID_FILE", error: "Choose a non-empty file." };
  }

  if (file.size > options.maxSizeBytes) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      error: `Files must be ${options.maxSizeLabel} or smaller.`,
    };
  }

  if (!isAllowedDeclaredType(file.type, options.allowedTypes)) {
    return {
      ok: false,
      code: "INVALID_FILE",
      error: `Upload a ${options.allowedTypeLabel}.`,
    };
  }

  if (!hasAllowedExtensionForMimeType(file.name, file.type)) {
    return {
      ok: false,
      code: "INVALID_FILE",
      error: `The file extension must match the selected ${options.allowedTypeLabel}.`,
    };
  }

  const detectedType = await detectUploadMimeType(file);

  if (!detectedType) {
    return {
      ok: false,
      code: "INVALID_FILE",
      error: `The file contents do not match a supported ${options.allowedTypeLabel}.`,
    };
  }

  if (detectedType !== file.type) {
    return {
      ok: false,
      code: "INVALID_FILE",
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
  const detectedType = await detectUploadMimeType(file);

  return detectedType === "application/pdf" ||
    detectedType === "image/jpeg" ||
    detectedType === "image/png"
    ? detectedType
    : null;
}

export async function detectUploadMimeType(
  file: File,
): Promise<SupportedUploadMimeType | null> {
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

  if (
    hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
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

function isAllowedDeclaredType(
  value: string,
  allowedTypes: readonly SupportedUploadMimeType[],
): value is SupportedUploadMimeType {
  return allowedTypes.includes(value as SupportedUploadMimeType);
}

function hasAllowedExtensionForMimeType(filename: string, mimeType: string) {
  const extension = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  const allowedExtensions = allowedExtensionsByMimeType[mimeType];

  return Boolean(extension && allowedExtensions?.includes(extension));
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((byte, index) => bytes[index] === byte);
}

const allowedExtensionsByMimeType: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
