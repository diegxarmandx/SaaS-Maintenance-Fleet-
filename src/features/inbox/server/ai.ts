import "server-only";

import { Buffer } from "node:buffer";

import type { MaintenanceAssetOption } from "@/features/maintenance/types";
import { normalizeMaintenanceExtraction } from "@/features/inbox/helpers";
import type { MaintenanceExtraction } from "@/features/inbox/types";
import { aiMaintenanceExtractionSchema } from "@/features/inbox/validation";
import { serverEnv } from "@/lib/env/server";

type AssetMatchCandidate = MaintenanceAssetOption & {
  vin_or_serial: string | null;
  license_plate: string | null;
  make: string | null;
  model: string | null;
};

export type IngestionExtractionResult =
  | {
      ok: true;
      extraction: MaintenanceExtraction;
      provider: "openai";
      model: string;
    }
  | {
      ok: false;
      provider: "none" | "openai";
      model: string | null;
      ownerMessage: string;
    };

export async function extractMaintenanceDraftFromFile({
  file,
  assets,
}: {
  file: File;
  assets: AssetMatchCandidate[];
}): Promise<IngestionExtractionResult> {
  if (serverEnv.AI_INGESTION_PROVIDER !== "openai" || !serverEnv.OPENAI_API_KEY) {
    return {
      ok: false,
      provider: "none",
      model: null,
      ownerMessage:
        "FleetReady could not read this file. Enter the maintenance details manually.",
    };
  }

  try {
    const rawExtraction = await callOpenAiExtraction(file, assets);
    const parsed = aiMaintenanceExtractionSchema.safeParse(rawExtraction);

    if (!parsed.success) {
      console.error("AI ingestion returned invalid extraction schema", {
        issues: parsed.error.issues.map((issue) => issue.path.join(".")),
      });

      return {
        ok: false,
        provider: "openai",
        model: serverEnv.OPENAI_INGESTION_MODEL,
        ownerMessage:
          "FleetReady could not read this file. Enter the maintenance details manually.",
      };
    }

    return {
      ok: true,
      extraction: normalizeMaintenanceExtraction(parsed.data, assets),
      provider: "openai",
      model: serverEnv.OPENAI_INGESTION_MODEL,
    };
  } catch (error) {
    console.error("AI ingestion failed", {
      provider: "openai",
      model: serverEnv.OPENAI_INGESTION_MODEL,
      error,
    });

    return {
      ok: false,
      provider: "openai",
      model: serverEnv.OPENAI_INGESTION_MODEL,
      ownerMessage:
        "FleetReady could not read this file. Enter the maintenance details manually.",
    };
  }
}

async function callOpenAiExtraction(file: File, assets: AssetMatchCandidate[]) {
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
                "You extract maintenance invoice and receipt data for FleetReady.",
                "Return only the requested JSON schema.",
                "Use null for fields that are not visible.",
                "Never invent prices, dates, meter readings, or asset identifiers.",
                "Do not make legal, tax, repair-status, work-order, driver, dispatch, route, GPS, ELD, payroll, or invoicing claims.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Match against these owner assets when possible: ${JSON.stringify(
                assets.map((asset) => ({
                  id: asset.id,
                  unitNumber: asset.unit_number,
                  assetName: asset.asset_name,
                  vinOrSerial: asset.vin_or_serial,
                  licensePlate: asset.license_plate,
                  make: asset.make,
                  model: asset.model,
                })),
              )}`,
            },
            file.type === "application/pdf"
              ? {
                  type: "input_file",
                  filename: file.name || "maintenance-receipt.pdf",
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
          name: "fleetready_maintenance_ingestion",
          strict: true,
          schema: openAiExtractionJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction failed with status ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  const text = extractTextFromOpenAiResponse(json);

  if (!text) {
    throw new Error("OpenAI extraction response did not include text output.");
  }

  return JSON.parse(text) as unknown;
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

const openAiExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    detectedDocumentType: nullableString,
    assetHint: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            unitNumber: nullableString,
            assetName: nullableString,
            vinOrSerial: nullableString,
            licensePlate: nullableString,
            confidence,
            reason: nullableString,
          },
          required: [
            "unitNumber",
            "assetName",
            "vinOrSerial",
            "licensePlate",
            "confidence",
            "reason",
          ],
        },
        { type: "null" },
      ],
    },
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
    overallConfidence: confidence,
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "detectedDocumentType",
    "assetHint",
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
    "overallConfidence",
    "warnings",
  ],
};
