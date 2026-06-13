export type DemoScenario = "full" | "minimal" | "empty";

export type DemoEnv = Record<string, string | undefined>;

export interface DemoIdentifiedRow {
  id: string;
}

export interface DemoCompany {
  id: string;
  company_name: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  preferred_timezone: string;
  preferred_measurement_settings: Record<string, unknown>;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface DemoProfile {
  full_name: string;
  email: string;
  company_id: string;
  onboarding_status: string;
}

export interface DemoAsset extends DemoIdentifiedRow {
  company_id: string;
  unit_number: string;
  asset_name: string;
  asset_type: string;
  current_mileage: number;
  current_engine_hours: number;
  status: string;
  archived_at: string | null;
}

export interface DemoMeterReading extends DemoIdentifiedRow {
  company_id: string;
  asset_id: string;
  reading_type: "mileage" | "engine_hours";
  reading_value: number;
  reading_date: string;
}

export interface DemoMaintenanceTemplate extends DemoIdentifiedRow {
  company_id: string | null;
  name: string;
}

export interface DemoMaintenanceRule extends DemoIdentifiedRow {
  company_id: string;
  asset_id: string;
  is_active: boolean;
  next_due_date: string | null;
  next_due_mileage: number | null;
  next_due_hours: number | null;
  reminder_days: number | null;
  reminder_mileage: number | null;
  reminder_hours: number | null;
}

export interface DemoMaintenanceRecord extends DemoIdentifiedRow {
  company_id: string;
  asset_id: string;
  maintenance_type: string;
}

export interface DemoComplianceRequirement extends DemoIdentifiedRow {
  company_id: string;
  asset_id: string | null;
  is_active: boolean;
  reminder_days: number;
  archived_at: string | null;
}

export interface DemoComplianceRecord extends DemoIdentifiedRow {
  company_id: string;
  requirement_id: string | null;
  asset_id: string | null;
  expiration_date: string | null;
  reminder_days: number;
  archived_at: string | null;
}

export interface DemoDocument extends DemoIdentifiedRow {
  company_id: string;
  asset_id: string | null;
  maintenance_record_id: string | null;
  compliance_record_id: string | null;
  document_name: string;
  storage_path: string;
  expiration_date: string | null;
  archived_at: string | null;
}

export interface DemoDocumentVersion extends DemoIdentifiedRow {
  company_id: string;
  document_id: string;
  storage_path: string;
}

export interface DemoNotification extends DemoIdentifiedRow {
  company_id: string;
  asset_id: string | null;
  related_entity_type: string;
  related_entity_id: string;
  notification_key: string;
}

export interface DemoAuditEvent extends DemoIdentifiedRow {
  company_id: string;
  entity_id: string | null;
}

export interface DemoSubscriptionRecord {
  company_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_key: string;
  status: string;
  asset_limit: number;
}

export interface DemoNotificationPreference {
  company_id: string;
}

export interface DemoReportPreference {
  company_id: string;
  default_asset_id: string | null;
}

export interface DemoSubscriptionFixture {
  name: string;
  expected: "full_access" | "read_only" | "read_only_over_limit" | "over_limit";
}

export interface DemoDataset {
  scenario: DemoScenario;
  baseDate: string;
  company: DemoCompany;
  profile: DemoProfile;
  subscriptionRecord: DemoSubscriptionRecord;
  notificationPreference: DemoNotificationPreference;
  reportPreference: DemoReportPreference;
  assets: DemoAsset[];
  meterReadings: DemoMeterReading[];
  maintenanceTemplates: DemoMaintenanceTemplate[];
  maintenanceRules: DemoMaintenanceRule[];
  maintenanceRecords: DemoMaintenanceRecord[];
  complianceRequirements: DemoComplianceRequirement[];
  complianceRecords: DemoComplianceRecord[];
  documents: DemoDocument[];
  documentVersions: DemoDocumentVersion[];
  notifications: DemoNotification[];
  auditEvents: DemoAuditEvent[];
  subscriptionFixtures: DemoSubscriptionFixture[];
}

export interface DemoDatasetOptions {
  scenario?: DemoScenario;
  baseDate?: Date;
}

export interface DemoDatasetSummary {
  scenario: DemoScenario;
  company: string;
  assets: number;
  activeAssets: number;
  archivedAssets: number;
  meterReadings: number;
  maintenanceRules: number;
  maintenanceRecords: number;
  complianceRecords: number;
  documents: number;
  notifications: number;
}

export interface DemoResetPlan {
  companyId: string;
  ownerEmails: string[];
  storagePrefix: string;
  storageBuckets: string[];
}

export const DEMO_COMPANY_ID: string;
export const DEMO_OWNER_EMAIL: string;
export const LEGACY_DEMO_OWNER_EMAIL: string;
export const DEMO_OWNER_NAME: string;
export const DEMO_COMPANY_NAME: string;
export const DEMO_TIMEZONE: string;
export const DEMO_PASSWORD_FALLBACK: string;
export const DEMO_RESET_CONFIRMATION: string;

export function isProductionLikeEnv(env?: DemoEnv): boolean;
export function assertCanRunDemoSeed(env?: DemoEnv, options?: { reset?: boolean }): void;
export function buildDemoDataset(options?: DemoDatasetOptions): DemoDataset;
export function getDemoResetPlan(): DemoResetPlan;
export function summarizeDemoDataset(dataset: DemoDataset): DemoDatasetSummary;
export function demoPdfBytes(): Uint8Array;
export function demoPngBytes(): Uint8Array;
