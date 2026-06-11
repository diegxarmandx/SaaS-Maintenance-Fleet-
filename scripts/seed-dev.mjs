import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vercelEnv = process.env.VERCEL_ENV;
const nodeEnv = process.env.NODE_ENV;

if (nodeEnv === "production" || vercelEnv === "production") {
  throw new Error("Refusing to run development seed in production.");
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const companyId = "11111111-1111-4111-8111-111111111111";
const tractorId = "22222222-2222-4222-8222-222222222222";
const trailerId = "33333333-3333-4333-8333-333333333333";
const skidSteerId = "44444444-4444-4444-8444-444444444444";
const ownerEmail = "owner.demo@fleetready.test";
const ownerPassword = "ChangeMe123!";

async function upsert(table, rows, onConflict = "id") {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

const existingProfile = await supabase
  .from("profiles")
  .select("id")
  .eq("email", ownerEmail)
  .maybeSingle();

let ownerId = existingProfile.data?.id;

if (!ownerId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: {
      full_name: "Avery Owner",
    },
  });

  if (error) {
    throw new Error(`auth user: ${error.message}`);
  }

  ownerId = data.user.id;
}

await upsert("companies", [
  {
    id: companyId,
    company_name: "North Coast Utility Fleet",
    owner_name: "Avery Owner",
    phone: "555-010-2200",
    email: ownerEmail,
    address: "100 Harbor Road, San Juan, PR",
    preferred_timezone: "America/Puerto_Rico",
    preferred_measurement_settings: {
      distanceUnit: "miles",
      engineHourTracking: true,
    },
    subscription_status: "trial",
  },
]);

await upsert("profiles", [
  {
    id: ownerId,
    full_name: "Avery Owner",
    email: ownerEmail,
    company_id: companyId,
    onboarding_status: "complete",
  },
]);

await upsert("assets", [
  {
    id: tractorId,
    company_id: companyId,
    unit_number: "T-101",
    asset_name: "Service Truck 101",
    asset_type: "Truck",
    year: 2020,
    make: "Ford",
    model: "F-250",
    vin_or_serial_number: "1FT7X2B60LEE00001",
    license_plate: "PR-101",
    current_mileage: 45210,
    current_engine_hours: 1350,
    purchase_date: "2021-02-15",
    purchase_price: 41900,
    status: "active",
    notes: "Primary owner-operated service truck.",
    asset_image_path: `${companyId}/assets/t-101.webp`,
  },
  {
    id: trailerId,
    company_id: companyId,
    unit_number: "TR-7",
    asset_name: "Equipment Trailer 7",
    asset_type: "Trailer",
    year: 2019,
    make: "Big Tex",
    model: "14ET",
    vin_or_serial_number: "16V1F2020K3000007",
    license_plate: "PR-TR7",
    current_mileage: 0,
    current_engine_hours: 0,
    purchase_date: "2020-04-01",
    purchase_price: 7800,
    status: "active",
  },
  {
    id: skidSteerId,
    company_id: companyId,
    unit_number: "EQ-3",
    asset_name: "Skid Steer 3",
    asset_type: "Loader",
    year: 2018,
    make: "Bobcat",
    model: "S650",
    vin_or_serial_number: "B3NW00003",
    current_mileage: 0,
    current_engine_hours: 2410,
    purchase_date: "2019-08-20",
    purchase_price: 36500,
    status: "active",
  },
]);

await upsert("meter_readings", [
  {
    id: "55555555-5555-4555-8555-555555555551",
    company_id: companyId,
    asset_id: tractorId,
    reading_type: "mileage",
    reading_value: 45210,
    reading_date: "2026-06-01T12:00:00Z",
    notes: "Monthly owner reading.",
  },
  {
    id: "55555555-5555-4555-8555-555555555552",
    company_id: companyId,
    asset_id: skidSteerId,
    reading_type: "engine_hours",
    reading_value: 2410,
    reading_date: "2026-06-01T12:00:00Z",
    notes: "Hour meter reading.",
  },
]);

await upsert("maintenance_templates", [
  {
    id: "66666666-6666-4666-8666-666666666661",
    company_id: companyId,
    name: "Oil and filter service",
    description: "Recurring preventive oil service.",
    default_mileage_interval: 5000,
    default_hour_interval: 250,
    default_calendar_interval_days: 180,
    is_active: true,
  },
]);

await upsert("maintenance_rules", [
  {
    id: "77777777-7777-4777-8777-777777777771",
    company_id: companyId,
    asset_id: tractorId,
    template_id: "66666666-6666-4666-8666-666666666661",
    name: "Truck oil service",
    description: "Owner-tracked preventive oil service.",
    mileage_interval: 5000,
    calendar_interval_days: 180,
    last_completed_date: "2026-03-01",
    last_completed_mileage: 42000,
    next_due_date: "2026-08-28",
    next_due_mileage: 47000,
    reminder_mileage: 500,
    reminder_days: 30,
    is_active: true,
  },
]);

await upsert("maintenance_records", [
  {
    id: "88888888-8888-4888-8888-888888888881",
    company_id: companyId,
    asset_id: tractorId,
    maintenance_rule_id: "77777777-7777-4777-8777-777777777771",
    maintenance_type: "Preventive oil service",
    completion_date: "2026-03-01",
    mileage: 42000,
    engine_hours: 1240,
    service_provider: "Owner completed",
    parts_cost: 88.5,
    labor_cost: 0,
    other_cost: 12,
    notes: "Oil, filter, and disposal supplies.",
  },
]);

await upsert("compliance_requirements", [
  {
    id: "99999999-9999-4999-8999-999999999901",
    company_id: companyId,
    asset_id: tractorId,
    compliance_type: "Vehicle registration",
    reminder_days: 45,
    notes: "Annual registration requirement.",
    is_active: true,
  },
  {
    id: "99999999-9999-4999-8999-999999999902",
    company_id: companyId,
    asset_id: tractorId,
    compliance_type: "Insurance",
    reminder_days: 30,
    notes: "Owner policy certificate.",
    is_active: true,
  },
  {
    id: "99999999-9999-4999-8999-999999999903",
    company_id: companyId,
    asset_id: trailerId,
    compliance_type: "Safety inspection",
    reminder_days: 30,
    notes: "Trailer safety inspection requirement without a current record.",
    is_active: true,
  },
  {
    id: "99999999-9999-4999-8999-999999999904",
    company_id: companyId,
    asset_id: skidSteerId,
    compliance_type: "Equipment certification",
    reminder_days: 60,
    notes: "Equipment certification requirement.",
    is_active: true,
  },
]);

await upsert("compliance_records", [
  {
    id: "99999999-9999-4999-8999-999999999991",
    company_id: companyId,
    asset_id: tractorId,
    requirement_id: "99999999-9999-4999-8999-999999999901",
    compliance_type: "Vehicle registration",
    issuing_organization: "Puerto Rico DMV",
    identification_number: "REG-T101-2026",
    effective_date: "2026-01-01",
    expiration_date: "2026-12-31",
    reminder_days: 45,
    notes: "Annual registration renewal.",
  },
  {
    id: "99999999-9999-4999-8999-999999999992",
    company_id: companyId,
    asset_id: tractorId,
    requirement_id: "99999999-9999-4999-8999-999999999902",
    compliance_type: "Insurance",
    issuing_organization: "Harbor Mutual",
    identification_number: "POL-T101-2026",
    effective_date: "2026-01-01",
    expiration_date: "2026-07-15",
    reminder_days: 45,
    notes: "Commercial auto policy certificate.",
  },
  {
    id: "99999999-9999-4999-8999-999999999993",
    company_id: companyId,
    asset_id: skidSteerId,
    requirement_id: "99999999-9999-4999-8999-999999999904",
    compliance_type: "Equipment certification",
    issuing_organization: "Island Equipment Safety",
    identification_number: "CERT-EQ3-2025",
    effective_date: "2025-01-01",
    expiration_date: "2026-05-01",
    reminder_days: 60,
    notes: "Expired sample certification.",
  },
]);

await upsert("documents", [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    company_id: companyId,
    asset_id: tractorId,
    compliance_record_id: "99999999-9999-4999-8999-999999999991",
    document_name: "Truck registration certificate",
    category: "compliance",
    document_type: "Registration",
    storage_bucket: "compliance-documents",
    storage_path: `${companyId}/compliance/registration-t101.pdf`,
    mime_type: "application/pdf",
    file_size: 0,
    issue_date: "2026-01-01",
    expiration_date: "2026-12-31",
    document_number: "REG-T101-2026",
    notes: "Metadata-only seed document.",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    company_id: companyId,
    asset_id: tractorId,
    compliance_record_id: "99999999-9999-4999-8999-999999999992",
    document_name: "Insurance certificate",
    category: "compliance",
    document_type: "Insurance",
    storage_bucket: "compliance-documents",
    storage_path: `${companyId}/compliance/insurance-t101.pdf`,
    mime_type: "application/pdf",
    file_size: 0,
    issue_date: "2026-01-01",
    expiration_date: "2026-07-15",
    document_number: "POL-T101-2026",
    notes: "Metadata-only seed document.",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    company_id: companyId,
    asset_id: tractorId,
    maintenance_record_id: "88888888-8888-4888-8888-888888888881",
    document_name: "Oil service receipt",
    category: "maintenance",
    document_type: "Maintenance receipt",
    storage_bucket: "maintenance-attachments",
    storage_path: `${companyId}/maintenance/88888888-8888-4888-8888-888888888881/oil-service-receipt.pdf`,
    mime_type: "application/pdf",
    file_size: 0,
    issue_date: "2026-03-01",
    document_number: "REC-OIL-0301",
    notes: "Metadata-only seed document.",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    company_id: companyId,
    asset_id: trailerId,
    document_name: "Trailer purchase agreement",
    category: "asset",
    document_type: "Purchase agreement",
    storage_bucket: "fleet-documents",
    storage_path: `${companyId}/asset/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4/purchase-agreement.pdf`,
    mime_type: "application/pdf",
    file_size: 0,
    issue_date: "2020-04-01",
    document_number: "PA-TR7",
    notes: "Metadata-only seed document.",
  },
]);

console.log(`Seeded development company ${companyId}`);
console.log(`Demo owner: ${ownerEmail} / ${ownerPassword}`);
