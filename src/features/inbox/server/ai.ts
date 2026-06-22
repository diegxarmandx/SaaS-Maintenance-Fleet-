import "server-only";

import { Buffer } from "node:buffer";

import { buildAssetExtractionContext } from "@/features/inbox/asset-helpers";
import type {
  InboxDocumentCategory,
  MaintenanceExtraction,
} from "@/features/inbox/types";
import { assetInboxExtractionSchema } from "@/features/inbox/validation";
import type { MaintenanceAssetOption } from "@/features/maintenance/types";
import { serverEnv } from "@/lib/env/server";

type KnownAsset = MaintenanceAssetOption & {
  vin_or_serial?: string | null;
  license_plate?: string | null;
  make?: string | null;
  model?: string | null;
};

export type IngestionExtractionResult =
  | {
      ok: true;
      extraction: MaintenanceExtraction;
      provider: "openai" | "mock";
      model: string;
    }
  | {
      ok: false;
      provider: "none" | "openai";
      model: string | null;
      ownerMessage: string;
    };

export async function extractAssetDraftFromFile({
  file,
  asset,
}: {
  file: File;
  asset: KnownAsset;
}): Promise<IngestionExtractionResult> {
  if (process.env.NODE_ENV === "test" || serverEnv.FLEETREADY_PLAYWRIGHT === "1") {
    return {
      ok: true,
      extraction: createMockExtraction(file, asset),
      provider: "mock",
      model: "deterministic-asset-inbox-v1",
    };
  }

  if (serverEnv.AI_INGESTION_PROVIDER !== "openai" || !serverEnv.OPENAI_API_KEY) {
    return {
      ok: false,
      provider: "none",
      model: null,
      ownerMessage:
        "Maintly could not read this file automatically. Review the fields and enter any missing details.",
    };
  }

  try {
    const rawExtraction = await callOpenAiExtraction(file, asset);
    const parsed = assetInboxExtractionSchema.safeParse(rawExtraction);

    if (!parsed.success) {
      console.error("Asset Inbox extraction returned an invalid schema", {
        issues: parsed.error.issues.map((issue) => issue.path.join(".")),
      });
      return extractionFailure("openai", serverEnv.OPENAI_INGESTION_MODEL);
    }

    return {
      ok: true,
      extraction: {
        detectedDocumentType: parsed.data.documentType.value,
        documentCategory: parsed.data.documentCategory,
        documentType: parsed.data.documentType,
        asset: {
          assetId: asset.id,
          label: `${asset.unit_number} ${asset.asset_name}`,
          confidence: 1,
          reason: "The upload came from this asset's Inbox.",
        },
        maintenanceDate: parsed.data.maintenanceDate,
        mileage: parsed.data.mileage,
        engineHours: parsed.data.engineHours,
        serviceProvider: parsed.data.serviceProvider,
        maintenanceType: parsed.data.maintenanceType,
        notes: parsed.data.notes,
        partsCost: parsed.data.partsCost,
        laborCost: parsed.data.laborCost,
        otherCost: parsed.data.otherCost,
        taxCost: parsed.data.taxCost,
        totalCost: parsed.data.totalCost,
        complianceExpirationDate: parsed.data.complianceExpirationDate,
        overallConfidence: parsed.data.overallConfidence,
        warnings: parsed.data.warnings,
      },
      provider: "openai",
      model: serverEnv.OPENAI_INGESTION_MODEL,
    };
  } catch (error) {
    console.error("Asset Inbox extraction failed", {
      provider: "openai",
      model: serverEnv.OPENAI_INGESTION_MODEL,
      error,
    });
    return extractionFailure("openai", serverEnv.OPENAI_INGESTION_MODEL);
  }
}

async function callOpenAiExtraction(file: File, asset: KnownAsset) {
  const fileDataUrl = await fileToDataUrl(file);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: serverEnv.OPENAI_INGESTION_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You extract structured fleet paperwork for an owner-reviewed draft.",
                "Return only the requested JSON schema.",
                "Use null when a value is not visible and never invent values.",
                "Classify the document as maintenance, compliance, or general.",
                "Do not make legal guarantees or create final records.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildAssetExtractionContext(asset),
            },
            file.type === "application/pdf"
              ? {
                  type: "input_file",
                  filename: file.name || "asset-paperwork.pdf",
                  file_data: fileDataUrl,
                }
              : {
                  type: "input_image",
                  image_url: fileDataUrl,
                  detail: "high",
                },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "fleetready_asset_inbox",
          strict: true,
          schema: openAiAssetExtractionSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction failed with status ${response.status}`);
  }

  const text = extractTextFromOpenAiResponse((await response.json()) as unknown);
  if (!text) {
    throw new Error("OpenAI extraction response did not include text output.");
  }

  return JSON.parse(text) as unknown;
}

function createMockExtraction(file: File, asset: KnownAsset): MaintenanceExtraction {
  const lowerName = file.name.toLowerCase();
  const category: InboxDocumentCategory = /insurance|registration|inspection|permit/.test(
    lowerName,
  )
    ? "compliance"
    : /invoice|receipt|oil|brake|service|repair/.test(lowerName)
      ? "maintenance"
      : "general";
  const documentType =
    category === "maintenance"
      ? "Maintenance receipt"
      : category === "compliance"
        ? /insurance/.test(lowerName)
          ? "Insurance"
          : /registration/.test(lowerName)
            ? "Registration"
            : "Inspection certificate"
        : /photo/.test(lowerName)
          ? "Photo"
          : "Other";

  return {
    detectedDocumentType: documentType,
    documentCategory: { value: category, confidence: 0.82 },
    documentType: { value: documentType, confidence: 0.82 },
    asset: {
      assetId: asset.id,
      label: `${asset.unit_number} ${asset.asset_name}`,
      confidence: 1,
      reason: "The upload came from this asset's Inbox.",
    },
    maintenanceDate: { value: null, confidence: 0 },
    mileage: { value: null, confidence: 0 },
    engineHours: { value: null, confidence: 0 },
    serviceProvider: { value: null, confidence: 0 },
    maintenanceType: {
      value: category === "maintenance" ? "Maintenance service" : null,
      confidence: category === "maintenance" ? 0.65 : 0,
    },
    notes: { value: null, confidence: 0 },
    partsCost: { value: 0, confidence: 0 },
    laborCost: { value: 0, confidence: 0 },
    otherCost: { value: 0, confidence: 0 },
    taxCost: { value: 0, confidence: 0 },
    totalCost: { value: 0, confidence: 0 },
    complianceExpirationDate: { value: null, confidence: 0 },
    overallConfidence: 0.6,
    warnings: ["Demo extraction: review every field before marking completed."],
  };
}

function extractionFailure(provider: "openai", model: string): IngestionExtractionResult {
  return {
    ok: false,
    provider,
    model,
    ownerMessage:
      "Maintly could not read this file automatically. Review the fields and enter any missing details.",
  };
}

function extractTextFromOpenAiResponse(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.output_text === "string") {
    return value.output_text;
  }
  if (!Array.isArray(value.output)) {
    return null;
  }
  for (const outputItem of value.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }
    for (const contentItem of outputItem.content) {
      if (isRecord(contentItem) && typeof contentItem.text === "string") {
        return contentItem.text;
      }
    }
  }
  return null;
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };
const nullableNumber = { anyOf: [{ type: "number", minimum: 0 }, { type: "null" }] };
const confidence = { type: "number", minimum: 0, maximum: 1 };
const extractedStringField = {
  type: "object",
  additionalProperties: false,
  properties: { value: nullableString, confidence },
  required: ["value", "confidence"],
};
const extractedNumberField = {
  type: "object",
  additionalProperties: false,
  properties: { value: nullableNumber, confidence },
  required: ["value", "confidence"],
};

const openAiAssetExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentCategory: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: {
          anyOf: [
            { type: "string", enum: ["maintenance", "compliance", "general"] },
            { type: "null" },
          ],
        },
        confidence,
      },
      required: ["value", "confidence"],
    },
    documentType: extractedStringField,
    maintenanceDate: extractedStringField,
    mileage: extractedNumberField,
    engineHours: extractedNumberField,
    serviceProvider: extractedStringField,
    maintenanceType: extractedStringField,
    notes: extractedStringField,
    partsCost: extractedNumberField,
    laborCost: extractedNumberField,
    otherCost: extractedNumberField,
    taxCost: extractedNumberField,
    totalCost: extractedNumberField,
    complianceExpirationDate: extractedStringField,
    overallConfidence: confidence,
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "documentCategory",
    "documentType",
    "maintenanceDate",
    "mileage",
    "engineHours",
    "serviceProvider",
    "maintenanceType",
    "notes",
    "partsCost",
    "laborCost",
    "otherCost",
    "taxCost",
    "totalCost",
    "complianceExpirationDate",
    "overallConfidence",
    "warnings",
  ],
};
