import type {
  AssetAttentionStatus,
  AssetFormFields,
  AssetFormState,
  AssetStatus,
  FleetAsset,
  MeterReadingFormFields,
  MeterReadingFormState,
} from "@/features/fleet/types";
import type {
  AssetFormValues,
  MeterReadingFormValues,
} from "@/features/fleet/validation";

export const emptyAssetFormFields: AssetFormFields = {
  unitNumber: "",
  assetName: "",
  assetType: "Truck",
  year: "",
  make: "",
  model: "",
  vinOrSerialNumber: "",
  licensePlate: "",
  currentMileage: "0",
  currentEngineHours: "0",
  purchaseDate: "",
  purchasePrice: "",
  status: "active",
  notes: "",
};

export const emptyAssetFormState: AssetFormState = {
  status: "idle",
  message: "",
  fields: emptyAssetFormFields,
  errors: {},
};

export function assetToFormFields(asset: FleetAsset): AssetFormFields {
  return {
    unitNumber: asset.unit_number,
    assetName: asset.asset_name,
    assetType: asset.asset_type,
    year: asset.year?.toString() ?? "",
    make: asset.make ?? "",
    model: asset.model ?? "",
    vinOrSerialNumber: asset.vin_or_serial_number ?? "",
    licensePlate: asset.license_plate ?? "",
    currentMileage: asset.current_mileage.toString(),
    currentEngineHours: asset.current_engine_hours.toString(),
    purchaseDate: asset.purchase_date ?? "",
    purchasePrice: asset.purchase_price?.toString() ?? "",
    status: asset.status,
    notes: asset.notes ?? "",
  };
}

export function getAssetFormState(fields: AssetFormFields): AssetFormState {
  return {
    status: "idle",
    message: "",
    fields,
    errors: {},
  };
}

export function getAssetFormFieldsFromFormData(formData: FormData): AssetFormFields {
  const getString = (key: keyof AssetFormFields) => String(formData.get(key) ?? "");

  return {
    unitNumber: getString("unitNumber"),
    assetName: getString("assetName"),
    assetType: getString("assetType"),
    year: getString("year"),
    make: getString("make"),
    model: getString("model"),
    vinOrSerialNumber: getString("vinOrSerialNumber"),
    licensePlate: getString("licensePlate"),
    currentMileage: getString("currentMileage"),
    currentEngineHours: getString("currentEngineHours"),
    purchaseDate: getString("purchaseDate"),
    purchasePrice: getString("purchasePrice"),
    status: getString("status") as AssetStatus,
    notes: getString("notes"),
  };
}

export function defaultMeterReadingFields(
  readingType: MeterReadingFormFields["readingType"] = "mileage",
): MeterReadingFormFields {
  return {
    readingType,
    readingValue: "",
    readingDate: new Date().toISOString().slice(0, 10),
    notes: "",
    isCorrection: false,
  };
}

export function getMeterReadingFieldsFromFormData(
  formData: FormData,
): MeterReadingFormFields {
  return {
    readingType: String(formData.get("readingType") ?? "mileage") as
      | "mileage"
      | "engine_hours",
    readingValue: String(formData.get("readingValue") ?? ""),
    readingDate: String(formData.get("readingDate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    isCorrection: formData.get("isCorrection") === "on",
  };
}

export function getMeterReadingFormState(
  fields = defaultMeterReadingFields(),
): MeterReadingFormState {
  return {
    status: "idle",
    message: "",
    fields,
    errors: {},
  };
}

export type AssetInsertPayload = {
  id: string;
  company_id: string;
  unit_number: string;
  asset_name: string;
  asset_type: string;
  year: number | null;
  make: string | null;
  model: string | null;
  vin_or_serial_number: string | null;
  license_plate: string | null;
  current_mileage: number;
  current_engine_hours: number;
  purchase_date: string | null;
  purchase_price: number | null;
  status: AssetStatus;
  notes: string | null;
  asset_image_path: string | null;
};

export type AssetUpdatePayload = Omit<AssetInsertPayload, "id" | "company_id">;

const nullableText = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

export function buildAssetInsertPayload(
  companyId: string,
  assetId: string,
  values: AssetFormValues,
  assetImagePath: string | null,
): AssetInsertPayload {
  return {
    id: assetId,
    company_id: companyId,
    unit_number: values.unitNumber,
    asset_name: values.assetName,
    asset_type: values.assetType,
    year: values.year ?? null,
    make: nullableText(values.make),
    model: nullableText(values.model),
    vin_or_serial_number: nullableText(values.vinOrSerialNumber),
    license_plate: nullableText(values.licensePlate),
    current_mileage: values.currentMileage,
    current_engine_hours: values.currentEngineHours,
    purchase_date: values.purchaseDate ?? null,
    purchase_price: values.purchasePrice ?? null,
    status: values.status,
    notes: nullableText(values.notes),
    asset_image_path: assetImagePath,
  };
}

export function buildAssetUpdatePayload(
  values: AssetFormValues,
  assetImagePath: string | null,
): AssetUpdatePayload {
  return {
    unit_number: values.unitNumber,
    asset_name: values.assetName,
    asset_type: values.assetType,
    year: values.year ?? null,
    make: nullableText(values.make),
    model: nullableText(values.model),
    vin_or_serial_number: nullableText(values.vinOrSerialNumber),
    license_plate: nullableText(values.licensePlate),
    current_mileage: values.currentMileage,
    current_engine_hours: values.currentEngineHours,
    purchase_date: values.purchaseDate ?? null,
    purchase_price: values.purchasePrice ?? null,
    status: values.status,
    notes: nullableText(values.notes),
    asset_image_path: assetImagePath,
  };
}

export function buildArchiveAssetPayload() {
  return {
    status: "archived" as const,
    archived_at: new Date().toISOString(),
  };
}

export function deriveAssetAttentionStatus(
  asset: Pick<
    FleetAsset,
    "archived_at" | "status" | "vin_or_serial_number" | "license_plate"
  >,
): AssetAttentionStatus {
  if (asset.archived_at || asset.status === "archived") {
    return "Archived";
  }

  if (!asset.vin_or_serial_number && !asset.license_plate) {
    return "Missing";
  }

  return "Current";
}

export type MeterReadingValidationInput = {
  reading: MeterReadingFormValues;
  currentMileage: number;
  currentEngineHours: number;
};

export function validateMeterReadingChange({
  reading,
  currentMileage,
  currentEngineHours,
}: MeterReadingValidationInput) {
  const currentValue =
    reading.readingType === "mileage" ? currentMileage : currentEngineHours;

  if (reading.readingValue < currentValue && !reading.isCorrection) {
    return {
      ok: false,
      message:
        reading.readingType === "mileage"
          ? "Mileage cannot decrease without marking this as a correction."
          : "Engine hours cannot decrease without marking this as a correction.",
    } as const;
  }

  if (reading.readingValue < currentValue && !reading.notes?.trim()) {
    return {
      ok: false,
      message: "A correction note is required when lowering a meter value.",
    } as const;
  }

  return { ok: true, message: "" } as const;
}

export function applyMeterReadingSnapshot(
  asset: Pick<FleetAsset, "current_mileage" | "current_engine_hours">,
  reading: MeterReadingFormValues,
) {
  const validation = validateMeterReadingChange({
    reading,
    currentMileage: asset.current_mileage,
    currentEngineHours: asset.current_engine_hours,
  });

  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    currentMileage:
      reading.readingType === "mileage" ? reading.readingValue : asset.current_mileage,
    currentEngineHours:
      reading.readingType === "engine_hours"
        ? reading.readingValue
        : asset.current_engine_hours,
  } as const;
}

export function filterAssetsForCompany<T extends { company_id: string }>(
  assets: T[],
  companyId: string,
) {
  return assets.filter((asset) => asset.company_id === companyId);
}

export function formatMeterValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "Not recorded";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatShortDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
