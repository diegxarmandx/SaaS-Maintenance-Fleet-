import { getCompanyDateKey } from "@/features/maintenance/schedule";
import type { ReportSearchParams } from "@/features/reports/server/queries";

export type ReportPreference = {
  company_id: string;
  default_asset_id: string | null;
  default_lookback_days: number;
  show_charts_by_default: boolean;
};

export type ReportPreferenceInput = {
  assetId: string;
  lookbackDays: number;
  showCharts: boolean;
};

export function defaultReportPreference(companyId: string): ReportPreference {
  return {
    company_id: companyId,
    default_asset_id: null,
    default_lookback_days: 90,
    show_charts_by_default: true,
  };
}

export function parseReportPreferenceForm(formData: FormData): ReportPreferenceInput {
  return {
    assetId: String(formData.get("defaultAssetId") ?? "").trim(),
    lookbackDays: clampLookbackDays(formData.get("defaultLookbackDays")),
    showCharts: formData.get("showChartsByDefault") === "on",
  };
}

export function hasExplicitReportFilters(searchParams: ReportSearchParams) {
  return Boolean(searchParams.assetId || searchParams.from || searchParams.to);
}

export function buildPreferredReportSearchParams({
  searchParams,
  preference,
  timezone,
  now = new Date(),
}: {
  searchParams: ReportSearchParams;
  preference: ReportPreference;
  timezone: string;
  now?: Date;
}): ReportSearchParams {
  if (hasExplicitReportFilters(searchParams)) {
    return searchParams;
  }

  const today = getCompanyDateKey(now, timezone);
  const preferred: ReportSearchParams = { ...searchParams };

  if (preference.default_asset_id) {
    preferred.assetId = preference.default_asset_id;
  }

  if (preference.default_lookback_days > 0) {
    preferred.to = today;
    preferred.from = subtractDays(today, preference.default_lookback_days);
  }

  return preferred;
}

function clampLookbackDays(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 90);

  if (!Number.isFinite(parsed)) {
    return 90;
  }

  return Math.min(3650, Math.max(0, Math.floor(parsed)));
}

function subtractDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}
