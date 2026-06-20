import type { MaintenanceAssetOption } from "@/features/maintenance/types";
import type {
  InboxReviewFields,
  IngestionAssetSuggestion,
  MaintenanceExtraction,
} from "@/features/inbox/types";
import type { AiMaintenanceExtraction } from "@/features/inbox/validation";

type AssetMatchCandidate = MaintenanceAssetOption & {
  vin_or_serial: string | null;
  license_plate: string | null;
  make: string | null;
  model: string | null;
};

export const emptyInboxUploadFormState = {
  status: "idle",
  message: "",
  errors: {},
} satisfies { status: "idle"; message: string; errors: Record<string, never> };

export const lowConfidenceThreshold = 0.75;

export function normalizeMaintenanceExtraction(
  extraction: AiMaintenanceExtraction,
  assets: AssetMatchCandidate[],
): MaintenanceExtraction {
  const asset = matchExtractedAsset(extraction, assets);

  return {
    detectedDocumentType: extraction.detectedDocumentType,
    asset,
    maintenanceDate: extraction.maintenanceDate,
    mileage: extraction.mileage,
    engineHours: extraction.engineHours,
    serviceProvider: extraction.serviceProvider,
    maintenanceType: extraction.maintenanceType,
    notes: extraction.notes,
    partsCost: extraction.partsCost,
    laborCost: extraction.laborCost,
    otherCost: extraction.otherCost,
    taxCost: extraction.taxCost,
    totalCost: extraction.totalCost,
    overallConfidence: extraction.overallConfidence,
    warnings: [...extraction.warnings, ...buildExtractionWarnings(extraction, asset)],
  };
}

export function extractionToReviewFields(
  extraction: MaintenanceExtraction | Record<string, never>,
): InboxReviewFields {
  if (!("maintenanceType" in extraction)) {
    return emptyInboxReviewFields();
  }

  return {
    assetId: extraction.asset.assetId ?? "",
    maintenanceRuleId: "",
    maintenanceType: extraction.maintenanceType.value ?? "",
    completionDate:
      extraction.maintenanceDate.value ?? new Date().toISOString().slice(0, 10),
    mileage: numberFieldToString(extraction.mileage.value),
    engineHours: numberFieldToString(extraction.engineHours.value),
    serviceProvider: extraction.serviceProvider.value ?? "",
    partsCost: numberFieldToString(extraction.partsCost.value ?? 0),
    laborCost: numberFieldToString(extraction.laborCost.value ?? 0),
    otherCost: numberFieldToString(extraction.otherCost.value ?? 0),
    taxCost: numberFieldToString(extraction.taxCost.value ?? 0),
    notes: extraction.notes.value ?? "",
    confirmMeterDecrease: false,
  };
}

export function emptyInboxReviewFields(): InboxReviewFields {
  return {
    assetId: "",
    maintenanceRuleId: "",
    maintenanceType: "",
    completionDate: new Date().toISOString().slice(0, 10),
    mileage: "",
    engineHours: "",
    serviceProvider: "",
    partsCost: "0",
    laborCost: "0",
    otherCost: "0",
    taxCost: "0",
    notes: "",
    confirmMeterDecrease: false,
  };
}

export function getInboxReviewFieldsFromFormData(formData: FormData): InboxReviewFields {
  const getString = (key: keyof InboxReviewFields) => String(formData.get(key) ?? "");

  return {
    assetId: getString("assetId"),
    maintenanceRuleId: getString("maintenanceRuleId"),
    maintenanceType: getString("maintenanceType"),
    completionDate: getString("completionDate"),
    mileage: getString("mileage"),
    engineHours: getString("engineHours"),
    serviceProvider: getString("serviceProvider"),
    partsCost: getString("partsCost"),
    laborCost: getString("laborCost"),
    otherCost: getString("otherCost"),
    taxCost: getString("taxCost"),
    notes: getString("notes"),
    confirmMeterDecrease: formData.get("confirmMeterDecrease") === "on",
  };
}

export function calculateReviewedTotal(fields: {
  partsCost: string;
  laborCost: string;
  otherCost: string;
  taxCost: string;
}) {
  return (
    Number(fields.partsCost || 0) +
    Number(fields.laborCost || 0) +
    Number(fields.otherCost || 0) +
    Number(fields.taxCost || 0)
  );
}

export function findMeterDecreaseWarnings(
  fields: Pick<InboxReviewFields, "mileage" | "engineHours">,
  asset: Pick<MaintenanceAssetOption, "current_mileage" | "current_engine_hours">,
) {
  const warnings: string[] = [];
  const mileage = fields.mileage ? Number(fields.mileage) : null;
  const engineHours = fields.engineHours ? Number(fields.engineHours) : null;

  if (mileage !== null && mileage < Number(asset.current_mileage ?? 0)) {
    warnings.push("Mileage is lower than this asset's current mileage.");
  }

  if (engineHours !== null && engineHours < Number(asset.current_engine_hours ?? 0)) {
    warnings.push("Engine hours are lower than this asset's current engine hours.");
  }

  return warnings;
}

export function hasCostMismatch(extraction: MaintenanceExtraction | Record<string, never>) {
  if (!("totalCost" in extraction) || extraction.totalCost.value === null) {
    return false;
  }

  const reviewed =
    Number(extraction.partsCost.value ?? 0) +
    Number(extraction.laborCost.value ?? 0) +
    Number(extraction.otherCost.value ?? 0) +
    Number(extraction.taxCost.value ?? 0);

  return Math.abs(reviewed - Number(extraction.totalCost.value)) > 0.01;
}

function matchExtractedAsset(
  extraction: AiMaintenanceExtraction,
  assets: AssetMatchCandidate[],
): IngestionAssetSuggestion {
  const hint = extraction.assetHint;

  if (!hint) {
    return { assetId: null, label: null, confidence: 0, reason: null };
  }

  const hintTokens = [
    hint.unitNumber,
    hint.assetName,
    hint.vinOrSerial,
    hint.licensePlate,
  ]
    .filter(Boolean)
    .map((value) => normalizeMatchText(String(value)));

  let best: { asset: AssetMatchCandidate; score: number; reason: string } | null = null;

  for (const asset of assets) {
    const fields = [
      asset.unit_number,
      asset.asset_name,
      asset.vin_or_serial,
      asset.license_plate,
      asset.make,
      asset.model,
    ].map((value) => normalizeMatchText(value ?? ""));
    const score = hintTokens.reduce(
      (current, token) =>
        Math.max(
          current,
          ...fields.map((field) => scoreTokenMatch(token, field)),
        ),
      0,
    );

    if (!best || score > best.score) {
      best = {
        asset,
        score,
        reason: score >= 0.95 ? "Exact asset clue matched." : "Closest asset clue match.",
      };
    }
  }

  if (!best || best.score < 0.55) {
    return {
      assetId: null,
      label: null,
      confidence: Math.min(hint.confidence, best?.score ?? 0),
      reason: "No confident asset match was found.",
    };
  }

  return {
    assetId: best.asset.id,
    label: `${best.asset.unit_number} ${best.asset.asset_name}`,
    confidence: Math.min(hint.confidence, best.score),
    reason: best.reason,
  };
}

function buildExtractionWarnings(
  extraction: AiMaintenanceExtraction,
  asset: IngestionAssetSuggestion,
) {
  const warnings: string[] = [];

  if (!asset.assetId) {
    warnings.push("No asset was matched. Choose the asset before saving.");
  }

  if (!extraction.maintenanceDate.value) {
    warnings.push("Maintenance date was not found.");
  }

  if (!extraction.maintenanceType.value) {
    warnings.push("Maintenance type was not found.");
  }

  if (extraction.overallConfidence < lowConfidenceThreshold) {
    warnings.push("Overall extraction confidence is low. Review every field.");
  }

  return warnings;
}

function scoreTokenMatch(token: string, field: string) {
  if (!token || !field) {
    return 0;
  }

  if (token === field) {
    return 1;
  }

  if (field.includes(token) || token.includes(field)) {
    return 0.82;
  }

  return 0;
}

function normalizeMatchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function numberFieldToString(value: number | null) {
  return value === null ? "" : String(value);
}
