export const DEMO_COMPANY_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_OWNER_EMAIL = "demo-owner@example.test";
export const LEGACY_DEMO_OWNER_EMAIL = "owner.demo@fleetready.test";
export const DEMO_OWNER_NAME = "Alex Rivera";
export const DEMO_COMPANY_NAME = "Northstar Fleet Services LLC";
export const DEMO_TIMEZONE = "America/Puerto_Rico";
export const DEMO_PASSWORD_FALLBACK = "ChangeMe-Demo-Only-123!";
export const DEMO_RESET_CONFIRMATION = "confirm";

const dayMs = 24 * 60 * 60 * 1000;

export function isProductionLikeEnv(env = process.env) {
  return (
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.DEMO_SEED_TARGET === "production"
  );
}

export function assertCanRunDemoSeed(env = process.env, { reset = false } = {}) {
  if (isProductionLikeEnv(env)) {
    throw new Error("Refusing to run demo seed in a production-like environment.");
  }

  if (env.DEMO_SEED_ALLOW !== "1") {
    throw new Error("Set DEMO_SEED_ALLOW=1 to confirm this is a development seed.");
  }

  if (reset && env.DEMO_SEED_RESET !== DEMO_RESET_CONFIRMATION) {
    throw new Error("Set DEMO_SEED_RESET=confirm before resetting demo data.");
  }
}

export function buildDemoDataset({ scenario = "full", baseDate = new Date() } = {}) {
  const dates = createDateHelpers(baseDate);
  const company = {
    id: DEMO_COMPANY_ID,
    company_name: DEMO_COMPANY_NAME,
    owner_name: DEMO_OWNER_NAME,
    phone: "555-0100",
    email: DEMO_OWNER_EMAIL,
    address: "DEMO ADDRESS - NOT REAL, 100 Fictional Yard Road, San Juan, PR 00900",
    preferred_timezone: DEMO_TIMEZONE,
    preferred_measurement_settings: {
      distanceUnit: "miles",
      engineHourTracking: true,
    },
    subscription_status: scenario === "empty" ? "trial" : "active",
    stripe_customer_id: scenario === "empty" ? null : "cus_demo_northstar_test",
    stripe_subscription_id: scenario === "empty" ? null : "sub_demo_northstar_active",
  };

  const assets = scenario === "empty" ? [] : buildAssets(dates, scenario);
  const assetByUnit = new Map(assets.map((asset) => [asset.unit_number, asset]));
  const meterReadings =
    scenario === "empty" ? [] : buildMeterReadings(dates, assetByUnit);
  const maintenanceTemplates = scenario === "empty" ? [] : buildMaintenanceTemplates();
  const maintenanceRules =
    scenario === "empty"
      ? []
      : buildMaintenanceRules(dates, assetByUnit, maintenanceTemplates);
  const maintenanceRecords =
    scenario === "empty"
      ? []
      : buildMaintenanceRecords(dates, assetByUnit, maintenanceRules);
  const complianceRequirements =
    scenario === "empty" ? [] : buildComplianceRequirements(assetByUnit);
  const complianceRecords =
    scenario === "empty"
      ? []
      : buildComplianceRecords(dates, assetByUnit, complianceRequirements);
  const documents =
    scenario === "empty"
      ? []
      : buildDocuments(dates, assetByUnit, maintenanceRecords, complianceRecords);
  const documentVersions = scenario === "empty" ? [] : buildDocumentVersions(documents);
  const notifications =
    scenario === "empty"
      ? []
      : buildNotifications(
          dates,
          assetByUnit,
          maintenanceRules,
          complianceRecords,
          documents,
        );
  const auditEvents = scenario === "empty" ? [] : buildAuditEvents(dates, documents);

  return {
    scenario,
    baseDate: dates.today,
    company,
    profile: {
      full_name: DEMO_OWNER_NAME,
      email: DEMO_OWNER_EMAIL,
      company_id: DEMO_COMPANY_ID,
      onboarding_status: "complete",
    },
    subscriptionRecord: {
      company_id: DEMO_COMPANY_ID,
      stripe_customer_id: company.stripe_customer_id,
      stripe_subscription_id: company.stripe_subscription_id,
      stripe_price_id: scenario === "empty" ? null : "price_demo_growing_fleet_test",
      plan_key: scenario === "empty" ? "starter" : "growing_fleet",
      status: company.subscription_status,
      current_period_start: dates.iso(-10),
      current_period_end: dates.iso(20),
      trial_end: null,
      cancel_at_period_end: false,
      asset_limit: scenario === "empty" ? 5 : 30,
      last_payment_status: scenario === "empty" ? null : "succeeded",
      restricted_at: null,
      updated_from_stripe_at: dates.iso(0),
      metadata: {
        demo: true,
        mode: scenario,
        note: "Fictional Stripe test-mode identifiers only.",
      },
    },
    notificationPreference: {
      company_id: DEMO_COMPANY_ID,
      email_enabled: false,
      maintenance_reminder_days: 30,
      compliance_reminder_days: 45,
      document_reminder_days: 45,
      email_warning_enabled: true,
      email_critical_enabled: true,
      quiet_hours_start: "20:00",
      quiet_hours_end: "07:00",
      weekly_summary_enabled: false,
      preferred_summary_day: 1,
    },
    reportPreference: {
      company_id: DEMO_COMPANY_ID,
      default_asset_id: assets[0]?.id ?? null,
      default_lookback_days: 180,
      show_charts_by_default: true,
    },
    assets,
    meterReadings,
    maintenanceTemplates,
    maintenanceRules,
    maintenanceRecords,
    complianceRequirements,
    complianceRecords,
    documents,
    documentVersions,
    notifications,
    auditEvents,
    subscriptionFixtures: buildSubscriptionFixtures(dates),
  };
}

function buildAssets(dates, scenario) {
  const allAssets = [
    asset(
      1,
      "DT-01",
      "Heavy Dump Truck 01",
      "Dump truck",
      2021,
      "Mack",
      "Granite DEMO",
      "DEMO-VIN-DT01-00001",
      "DEMO-DT01",
      68240,
      3180,
      -1210,
      145000,
      "active",
      "Primary heavy dump truck. Fictional demo asset.",
      `${DEMO_COMPANY_ID}/assets/${uuid(1)}/demo-dump-truck.png`,
    ),
    asset(
      2,
      "MD-14",
      "Medium-Duty Box Truck 14",
      "Truck",
      2020,
      "International",
      "MV607 DEMO",
      "DEMO-VIN-MD14-00002",
      "DEMO-MD14",
      54320,
      1840,
      -1040,
      78000,
      "active",
      "Mileage and engine-hour example.",
    ),
    asset(
      3,
      "PU-22",
      "Pickup Service Truck 22",
      "Pickup",
      2022,
      "Ford",
      "F-250 DEMO",
      "DEMO-VIN-PU22-00003",
      "DEMO-PU22",
      28640,
      910,
      -760,
      52000,
      "active",
      "Light service pickup with current registration.",
    ),
    asset(
      4,
      "VN-08",
      "Cargo Van 08",
      "Van",
      2019,
      "Ram",
      "ProMaster DEMO",
      "DEMO-VIN-VN08-00004",
      "DEMO-VN08",
      73410,
      0,
      -1660,
      31500,
      "active",
      "Mileage-only van for layout and filter testing.",
    ),
    asset(
      5,
      "FB-03",
      "Flatbed Trailer 03",
      "Trailer",
      2018,
      "Fictional Trailer Co.",
      "FB-20 DEMO",
      "DEMO-SERIAL-FB03",
      "DEMO-FB03",
      0,
      0,
      -1880,
      14200,
      "active",
      "Trailer with no meter readings and all compliance current.",
    ),
    asset(
      6,
      "DTL-09",
      "Dump Trailer 09",
      "Trailer",
      2020,
      "Demo Haul",
      "DT-14 DEMO",
      "DEMO-SERIAL-DTL09",
      "DEMO-DTL09",
      0,
      0,
      -980,
      18800,
      "active",
      "Trailer intentionally missing insurance for missing-compliance state.",
    ),
    asset(
      7,
      "EX-12",
      "Excavator 12",
      "Excavator",
      2017,
      "Caterpillar",
      "320 DEMO",
      "DEMO-SERIAL-EX12",
      null,
      0,
      4935,
      -2300,
      118000,
      "active",
      "Engine-hour-only excavator with overdue hydraulic service.",
    ),
    asset(
      8,
      "BH-04",
      "Backhoe 04",
      "Backhoe",
      2016,
      "John Deere",
      "310 DEMO",
      "DEMO-SERIAL-BH04",
      null,
      0,
      3880,
      -2500,
      68000,
      "active",
      "Equipment certification expiring soon.",
    ),
    asset(
      9,
      "WL-17",
      "Wheel Loader 17",
      "Loader",
      2018,
      "Volvo",
      "L70 DEMO",
      "DEMO-SERIAL-WL17",
      null,
      0,
      4520,
      -2100,
      96000,
      "active",
      "Engine-hour and calendar maintenance example.",
    ),
    asset(
      10,
      "GN-02",
      "Generator 02",
      "Generator",
      2021,
      "Generac",
      "MMG DEMO",
      "DEMO-SERIAL-GN02",
      null,
      0,
      1260,
      -900,
      24000,
      "active",
      "Equipment with certification missing.",
    ),
    asset(
      11,
      "SS-05",
      "Skid Steer 05",
      "Skid steer",
      2019,
      "Bobcat",
      "S650 DEMO",
      "DEMO-SERIAL-SS05",
      null,
      0,
      2410,
      -1400,
      36500,
      "active",
      "Hour meter history and expired certification.",
    ),
    asset(
      12,
      "EQ-LONG-001",
      "Very Long Named Compact Utility Machine Used For Layout Stress Testing",
      "Other equipment",
      2023,
      "DemoWorks",
      "Utility Max Long Label Edition",
      "DEMO-SERIAL-LONG-001",
      null,
      0,
      215,
      -260,
      17500,
      "active",
      "Long name intentionally tests card/table wrapping.",
    ),
    asset(
      13,
      "MIN-01",
      "Minimal Info Yard Cart",
      "Other equipment",
      null,
      null,
      null,
      null,
      null,
      0,
      0,
      -120,
      null,
      "active",
      "Minimal optional fields for empty-detail testing.",
    ),
    asset(
      14,
      "AR-01",
      "Archived Pickup 01",
      "Pickup",
      2014,
      "Chevrolet",
      "2500 DEMO",
      "DEMO-VIN-AR01-00014",
      "DEMO-AR01",
      128400,
      0,
      -3400,
      19000,
      "archived",
      "Archived asset retained for history testing.",
      null,
      dates.iso(-45),
    ),
    asset(
      15,
      "AR-TR-02",
      "Archived Utility Trailer 02",
      "Trailer",
      2013,
      "Demo Trailer",
      "UT-12 DEMO",
      "DEMO-SERIAL-ARTR02",
      "DEMO-ARTR2",
      0,
      0,
      -3600,
      6200,
      "archived",
      "Archived trailer retained for document history.",
      null,
      dates.iso(-90),
    ),
  ];

  return scenario === "minimal" ? allAssets.slice(0, 3) : allAssets;
}

function buildMeterReadings(dates, assetByUnit) {
  return [
    ...mileageSeries(
      assetByUnit.get("DT-01"),
      [60400, 62600, 65100, 66900, 68240],
      [-150, -110, -70, -30, -3],
      "Dump truck monthly mileage",
    ),
    ...hoursSeries(
      assetByUnit.get("DT-01"),
      [2820, 2925, 3020, 3110, 3180],
      [-150, -110, -70, -30, -3],
      "Dump truck hour meter",
    ),
    ...mileageSeries(
      assetByUnit.get("MD-14"),
      [49200, 50880, 52450, 53800, 54320],
      [-170, -120, -80, -40, -5],
      "Box truck mileage",
    ),
    ...hoursSeries(
      assetByUnit.get("MD-14"),
      [1610, 1685, 1742, 1805, 1840],
      [-170, -120, -80, -40, -5],
      "Box truck hours",
    ),
    ...mileageSeries(
      assetByUnit.get("PU-22"),
      [24500, 26100, 27400, 28640],
      [-120, -75, -35, -2],
      "Pickup odometer",
    ),
    ...mileageSeries(
      assetByUnit.get("VN-08"),
      [69000, 70500, 72150, 73410],
      [-130, -90, -45, -6],
      "Cargo van odometer",
    ),
    ...hoursSeries(
      assetByUnit.get("EX-12"),
      [4320, 4510, 4700, 4860, 4935],
      [-180, -130, -85, -35, -4],
      "Excavator hour meter",
    ),
    ...hoursSeries(
      assetByUnit.get("BH-04"),
      [3520, 3660, 3770, 3880],
      [-160, -110, -55, -7],
      "Backhoe hour meter",
    ),
    ...hoursSeries(
      assetByUnit.get("WL-17"),
      [4110, 4260, 4390, 4520],
      [-150, -95, -44, -8],
      "Loader hour meter",
    ),
    ...hoursSeries(
      assetByUnit.get("GN-02"),
      [980, 1090, 1180, 1260],
      [-140, -85, -38, -1],
      "Generator hour meter",
    ),
    ...hoursSeries(
      assetByUnit.get("SS-05"),
      [2150, 2250, 2355, 2410],
      [-150, -100, -50, -10],
      "Skid steer hour meter",
    ),
    ...hoursSeries(
      assetByUnit.get("EQ-LONG-001"),
      [100, 145, 190, 215],
      [-90, -60, -25, -2],
      "Long-name equipment hours",
    ),
  ].map((reading, index) => ({
    id: uuid(5000 + index + 1),
    company_id: DEMO_COMPANY_ID,
    ...reading,
    reading_date: dates.iso(reading.offsetDays),
    notes: `${reading.notes}. DEMO DATA - NOT REAL.`,
    is_correction: false,
  }));
}

function buildMaintenanceTemplates() {
  const names = [
    ["Engine oil and filter", "Recurring engine oil and filter service.", 5000, 250, 180],
    ["Fuel filter", "Fuel filter replacement.", 10000, 500, 365],
    ["Air filter", "Engine air filter inspection or replacement.", 7500, 300, 180],
    ["Transmission service", "Transmission fluid and filter service.", 30000, null, 730],
    ["Differential service", "Differential oil service.", 30000, null, 730],
    ["Hydraulic service", "Hydraulic fluid and filter service.", null, 500, 365],
    ["Coolant service", "Coolant inspection and service.", 25000, 1000, 730],
    ["Brake inspection", "Brake inspection and adjustment.", 10000, null, 180],
    ["Tire inspection", "Tire condition and pressure inspection.", 3000, null, 90],
    ["Tire replacement", "Tire replacement planning rule.", 45000, null, null],
    ["Battery replacement", "Battery age and condition review.", null, null, 1095],
    ["Greasing", "Greasing for equipment pivot points.", null, 100, 30],
    [
      "Annual preventive maintenance",
      "Annual owner preventive maintenance review.",
      null,
      null,
      365,
    ],
    ["Custom maintenance item", "Owner-defined maintenance item.", null, 200, 120],
  ];

  return names.map(([name, description, mileage, hours, days], index) => ({
    id: uuid(6000 + index + 1),
    company_id: DEMO_COMPANY_ID,
    name,
    description,
    default_mileage_interval: mileage,
    default_hour_interval: hours,
    default_calendar_interval_days: days,
    is_active: true,
  }));
}

function buildMaintenanceRules(dates, assetByUnit, templates) {
  const templateId = (name) => templates.find((template) => template.name === name)?.id;
  const ruleRows = [
    [
      "DT-01",
      "Engine oil and filter",
      "Dump truck oil and filter",
      5000,
      null,
      180,
      -150,
      64200,
      null,
      69200,
      null,
      500,
      null,
      30,
      true,
    ],
    [
      "DT-01",
      "Brake inspection",
      "Dump truck brake inspection",
      null,
      null,
      180,
      -220,
      null,
      null,
      null,
      null,
      null,
      null,
      30,
      true,
    ],
    [
      "MD-14",
      "Fuel filter",
      "Box truck fuel filter",
      10000,
      null,
      365,
      -300,
      44800,
      null,
      54800,
      null,
      750,
      null,
      30,
      true,
    ],
    [
      "PU-22",
      "Tire inspection",
      "Pickup tire inspection",
      3000,
      null,
      90,
      -70,
      26000,
      null,
      29000,
      null,
      500,
      null,
      21,
      true,
    ],
    [
      "VN-08",
      "Transmission service",
      "Cargo van transmission service",
      30000,
      null,
      730,
      -760,
      42000,
      null,
      72000,
      null,
      1000,
      null,
      45,
      true,
    ],
    [
      "EX-12",
      "Hydraulic service",
      "Excavator hydraulic service",
      null,
      500,
      365,
      -420,
      null,
      4300,
      null,
      4800,
      null,
      50,
      30,
      true,
    ],
    [
      "BH-04",
      "Greasing",
      "Backhoe greasing",
      null,
      100,
      30,
      -40,
      null,
      3785,
      null,
      3885,
      null,
      20,
      7,
      true,
    ],
    [
      "WL-17",
      "Air filter",
      "Loader air filter",
      null,
      300,
      180,
      -95,
      null,
      4300,
      null,
      4600,
      null,
      75,
      30,
      true,
    ],
    [
      "GN-02",
      "Annual preventive maintenance",
      "Generator annual PM",
      null,
      null,
      365,
      -330,
      null,
      null,
      null,
      null,
      null,
      null,
      45,
      true,
    ],
    [
      "SS-05",
      "Custom maintenance item",
      "Skid steer attachment coupler check",
      null,
      200,
      120,
      -155,
      null,
      2200,
      null,
      2400,
      null,
      40,
      14,
      true,
    ],
    [
      "EQ-LONG-001",
      "Battery replacement",
      "Long-name equipment battery review",
      null,
      null,
      1095,
      -820,
      null,
      null,
      null,
      null,
      null,
      null,
      60,
      true,
    ],
    [
      "FB-03",
      "Annual preventive maintenance",
      "Flatbed trailer annual PM",
      null,
      null,
      365,
      -100,
      null,
      null,
      null,
      null,
      null,
      null,
      45,
      false,
    ],
  ];

  return ruleRows.map((row, index) => {
    const [
      unit,
      templateName,
      name,
      mileageInterval,
      hourInterval,
      calendarIntervalDays,
      lastOffset,
      lastMileage,
      lastHours,
      explicitNextMileage,
      explicitNextHours,
      reminderMileage,
      reminderHours,
      reminderDays,
      isActive,
    ] = row;
    const asset = assetByUnit.get(unit);
    const lastDate = dates.date(lastOffset);

    return {
      id: uuid(7000 + index + 1),
      company_id: DEMO_COMPANY_ID,
      asset_id: asset.id,
      template_id: templateId(templateName),
      name,
      description: `${name}. DEMO RULE - NOT REAL.`,
      mileage_interval: mileageInterval,
      hour_interval: hourInterval,
      calendar_interval_days: calendarIntervalDays,
      last_completed_date: lastDate,
      last_completed_mileage: lastMileage,
      last_completed_hours: lastHours,
      next_due_date: calendarIntervalDays
        ? dates.date(lastOffset + calendarIntervalDays)
        : null,
      next_due_mileage:
        explicitNextMileage ??
        (lastMileage && mileageInterval ? lastMileage + mileageInterval : null),
      next_due_hours:
        explicitNextHours ??
        (lastHours && hourInterval ? lastHours + hourInterval : null),
      reminder_mileage: reminderMileage,
      reminder_hours: reminderHours,
      reminder_days: reminderDays,
      is_active: isActive,
    };
  });
}

function buildMaintenanceRecords(dates, assetByUnit, rules) {
  const ruleByName = new Map(rules.map((rule) => [rule.name, rule]));
  const records = [
    [
      "DT-01",
      "Dump truck oil and filter",
      "Engine oil and filter",
      -150,
      64200,
      2820,
      "DEMO Provider - Harbor Fleet Supplies",
      210.4,
      185,
      18.5,
      "Oil, filters, disposal supplies.",
    ],
    [
      "DT-01",
      "Dump truck oil and filter",
      "Engine oil and filter",
      -320,
      59200,
      2580,
      "DEMO Provider - Harbor Fleet Supplies",
      198.2,
      175,
      15,
      "Prior oil service.",
    ],
    [
      "DT-01",
      "Dump truck brake inspection",
      "Brake inspection",
      -220,
      61010,
      2700,
      "DEMO Provider - Northstar Owner",
      42,
      120,
      0,
      "Brake inspection and adjustment.",
    ],
    [
      "MD-14",
      "Box truck fuel filter",
      "Fuel filter",
      -300,
      44800,
      1450,
      "DEMO Provider - Bay Parts Counter",
      86.1,
      95,
      0,
      "Fuel filters replaced.",
    ],
    [
      "PU-22",
      "Pickup tire inspection",
      "Tire inspection",
      -70,
      26000,
      820,
      "DEMO Provider - Northstar Owner",
      0,
      40,
      0,
      "Tire inspection.",
    ],
    [
      "VN-08",
      "Cargo van transmission service",
      "Transmission service",
      -760,
      42000,
      null,
      "DEMO Provider - Metro Transmission",
      380,
      460,
      35,
      "Transmission service.",
    ],
    [
      "EX-12",
      "Excavator hydraulic service",
      "Hydraulic service",
      -420,
      null,
      4300,
      "DEMO Provider - Island Hydraulic",
      640,
      520,
      45,
      "Hydraulic service.",
    ],
    [
      "BH-04",
      "Backhoe greasing",
      "Greasing",
      -40,
      null,
      3785,
      "DEMO Provider - Northstar Owner",
      24.5,
      35,
      0,
      "Greasing service.",
    ],
    [
      "WL-17",
      "Loader air filter",
      "Air filter",
      -95,
      null,
      4300,
      "DEMO Provider - Equipment Supply Demo",
      74.25,
      55,
      0,
      "Air filter replacement.",
    ],
    [
      "GN-02",
      "Generator annual PM",
      "Annual preventive maintenance",
      -330,
      null,
      1100,
      "DEMO Provider - Generator Service Demo",
      155,
      210,
      25,
      "Annual PM.",
    ],
    [
      "SS-05",
      "Skid steer attachment coupler check",
      "Custom coupler check",
      -155,
      null,
      2200,
      "DEMO Provider - Northstar Owner",
      35,
      65,
      0,
      "Custom maintenance inspection.",
    ],
    [
      "AR-01",
      null,
      "Battery replacement",
      -500,
      126000,
      null,
      "DEMO Provider - Battery Shop",
      180,
      75,
      8,
      "Archived asset historical battery replacement.",
    ],
  ];

  return records.map((row, index) => {
    const [
      unit,
      ruleName,
      type,
      offset,
      mileage,
      hours,
      provider,
      parts,
      labor,
      other,
      notes,
    ] = row;
    return {
      id: uuid(8000 + index + 1),
      company_id: DEMO_COMPANY_ID,
      asset_id: assetByUnit.get(unit).id,
      maintenance_rule_id: ruleName ? (ruleByName.get(ruleName)?.id ?? null) : null,
      maintenance_type: type,
      completion_date: dates.date(offset),
      mileage,
      engine_hours: hours,
      service_provider: provider,
      parts_cost: parts,
      labor_cost: labor,
      other_cost: other,
      tax_cost: 0,
      total_cost: Number(parts) + Number(labor) + Number(other),
      notes: `${notes} DEMO RECORD - NOT REAL.`,
      archived_at: null,
      created_at: dates.iso(offset),
      updated_at: dates.iso(offset),
    };
  });
}

function buildComplianceRequirements(assetByUnit) {
  const requirements = [
    ["DT-01", "Registration", 45, true],
    ["DT-01", "Insurance", 45, true],
    ["MD-14", "Safety inspection", 30, true],
    ["MD-14", "Commercial vehicle permit", 45, true],
    ["PU-22", "Municipal permit", 30, true],
    ["VN-08", "Operating license", 60, true],
    ["FB-03", "Registration", 45, true],
    ["FB-03", "Insurance", 45, true],
    ["DTL-09", "Insurance", 45, true],
    ["EX-12", "Weight certification", 30, true],
    ["BH-04", "Equipment certification", 60, true],
    ["GN-02", "Equipment certification", 60, true],
    ["SS-05", "Equipment certification", 60, true],
    ["WL-17", "Emissions requirement", 45, true],
    ["EQ-LONG-001", "Custom requirement", 30, true],
  ];

  return requirements.map(([unit, type, reminderDays, isActive], index) => ({
    id: uuid(9000 + index + 1),
    company_id: DEMO_COMPANY_ID,
    asset_id: assetByUnit.get(unit).id,
    compliance_type: type,
    reminder_days: reminderDays,
    notes: `${type} requirement for demo review only. Not legal advice.`,
    is_active: isActive,
    archived_at: null,
  }));
}

function buildComplianceRecords(dates, assetByUnit, requirements) {
  const req = (unit, type) =>
    requirements.find(
      (requirement) =>
        requirement.asset_id === assetByUnit.get(unit).id &&
        requirement.compliance_type === type,
    )?.id ?? null;
  const records = [
    ["DT-01", "Registration", "DEMO Motor Office", "DEMO-REG-DT01", -170, 170, 45],
    ["DT-01", "Insurance", "DEMO Harbor Mutual", "DEMO-POL-DT01", -170, 20, 45],
    [
      "MD-14",
      "Safety inspection",
      "DEMO Inspection Station",
      "DEMO-INSP-MD14",
      -360,
      -8,
      30,
    ],
    [
      "MD-14",
      "Commercial vehicle permit",
      "DEMO Permit Office",
      "DEMO-CVP-MD14",
      -60,
      250,
      45,
    ],
    ["PU-22", "Municipal permit", "DEMO Municipal Office", "DEMO-MUN-PU22", -20, 15, 30],
    [
      "VN-08",
      "Operating license",
      "DEMO Licensing Office",
      "DEMO-OP-VN08",
      -200,
      210,
      60,
    ],
    ["FB-03", "Registration", "DEMO Motor Office", "DEMO-REG-FB03", -120, 260, 45],
    ["FB-03", "Insurance", "DEMO Harbor Mutual", "DEMO-POL-FB03", -120, 260, 45],
    ["EX-12", "Weight certification", "DEMO Scale House", "DEMO-WGT-EX12", -400, -40, 30],
    [
      "BH-04",
      "Equipment certification",
      "DEMO Equipment Safety",
      "DEMO-CERT-BH04",
      -300,
      30,
      60,
    ],
    [
      "SS-05",
      "Equipment certification",
      "DEMO Equipment Safety",
      "DEMO-CERT-SS05",
      -420,
      -30,
      60,
    ],
    [
      "WL-17",
      "Emissions requirement",
      "DEMO Emissions Office",
      "DEMO-EM-WL17",
      -80,
      120,
      45,
    ],
    [
      "EQ-LONG-001",
      "Custom requirement",
      "DEMO Custom Authority",
      "DEMO-CUST-LONG",
      -100,
      400,
      30,
    ],
  ];

  return records.map((row, index) => {
    const [unit, type, issuer, number, effectiveOffset, expirationOffset, reminderDays] =
      row;
    return {
      id: uuid(10000 + index + 1),
      company_id: DEMO_COMPANY_ID,
      asset_id: assetByUnit.get(unit).id,
      requirement_id: req(unit, type),
      compliance_type: type,
      issuing_organization: issuer,
      identification_number: number,
      effective_date: dates.date(effectiveOffset),
      expiration_date: dates.date(expirationOffset),
      reminder_days: reminderDays,
      status_override: null,
      notes: `${type} demo record. DEMO DOCUMENT - NOT VALID.`,
      archived_at: index === 12 ? dates.iso(-20) : null,
    };
  });
}

function buildDocuments(dates, assetByUnit, maintenanceRecords, complianceRecords) {
  const maintenanceByType = new Map(
    maintenanceRecords.map((record) => [record.maintenance_type, record]),
  );
  const complianceByNumber = new Map(
    complianceRecords.map((record) => [record.identification_number, record]),
  );
  const docs = [
    doc(
      1,
      "DT-01",
      null,
      complianceByNumber.get("DEMO-REG-DT01"),
      "Registration - DT-01",
      "compliance",
      "Registration",
      "compliance-documents",
      "registration-dt01.pdf",
      dates.date(-170),
      dates.date(170),
      "DEMO-REG-DT01",
    ),
    doc(
      2,
      "DT-01",
      null,
      complianceByNumber.get("DEMO-POL-DT01"),
      "Insurance certificate - DT-01",
      "compliance",
      "Insurance",
      "compliance-documents",
      "insurance-dt01.pdf",
      dates.date(-170),
      dates.date(20),
      "DEMO-POL-DT01",
    ),
    doc(
      3,
      "MD-14",
      null,
      complianceByNumber.get("DEMO-INSP-MD14"),
      "Expired safety inspection - MD-14",
      "compliance",
      "Inspection certificate",
      "compliance-documents",
      "inspection-md14-expired.pdf",
      dates.date(-360),
      dates.date(-8),
      "DEMO-INSP-MD14",
    ),
    doc(
      4,
      "FB-03",
      null,
      complianceByNumber.get("DEMO-REG-FB03"),
      "Flatbed registration",
      "compliance",
      "Registration",
      "compliance-documents",
      "registration-fb03.pdf",
      dates.date(-120),
      dates.date(260),
      "DEMO-REG-FB03",
    ),
    doc(
      5,
      "FB-03",
      null,
      complianceByNumber.get("DEMO-POL-FB03"),
      "Flatbed insurance",
      "compliance",
      "Insurance",
      "compliance-documents",
      "insurance-fb03.pdf",
      dates.date(-120),
      dates.date(260),
      "DEMO-POL-FB03",
    ),
    doc(
      6,
      "DT-01",
      maintenanceByType.get("Engine oil and filter"),
      null,
      "Oil service receipt - DT-01",
      "maintenance",
      "Maintenance receipt",
      "maintenance-attachments",
      "oil-service-dt01.pdf",
      dates.date(-150),
      null,
      "DEMO-REC-DT01-OIL",
    ),
    doc(
      7,
      "DT-01",
      maintenanceRecords[2],
      null,
      "Brake inspection invoice - DT-01",
      "maintenance",
      "Repair invoice",
      "maintenance-attachments",
      "brake-inspection-dt01.pdf",
      dates.date(-220),
      null,
      "DEMO-INV-DT01-BRAKE",
    ),
    doc(
      8,
      "EX-12",
      maintenanceByType.get("Hydraulic service"),
      null,
      "Hydraulic service receipt - EX-12",
      "maintenance",
      "Parts receipt",
      "maintenance-attachments",
      "hydraulic-ex12.pdf",
      dates.date(-420),
      null,
      "DEMO-REC-EX12-HYD",
    ),
    doc(
      9,
      "PU-22",
      null,
      null,
      "Pickup purchase agreement",
      "asset",
      "Purchase agreement",
      "fleet-documents",
      "purchase-pu22.pdf",
      dates.date(-760),
      null,
      "DEMO-PA-PU22",
    ),
    doc(
      10,
      "GN-02",
      null,
      null,
      "Generator warranty expiring soon",
      "asset",
      "Warranty",
      "fleet-documents",
      "warranty-gn02.pdf",
      dates.date(-700),
      dates.date(18),
      "DEMO-WAR-GN02",
    ),
    doc(
      11,
      "SS-05",
      null,
      complianceByNumber.get("DEMO-CERT-SS05"),
      "Expired skid steer certification",
      "compliance",
      "Equipment certification",
      "compliance-documents",
      "cert-ss05-expired.pdf",
      dates.date(-420),
      dates.date(-30),
      "DEMO-CERT-SS05",
    ),
    doc(
      12,
      "WL-17",
      null,
      complianceByNumber.get("DEMO-EM-WL17"),
      "Loader emissions document",
      "compliance",
      "Vehicle permit",
      "compliance-documents",
      "emissions-wl17.pdf",
      dates.date(-80),
      dates.date(120),
      "DEMO-EM-WL17",
    ),
    doc(
      13,
      "BH-04",
      null,
      complianceByNumber.get("DEMO-CERT-BH04"),
      "Backhoe certification expiring soon",
      "compliance",
      "Equipment certification",
      "compliance-documents",
      "cert-bh04.pdf",
      dates.date(-300),
      dates.date(30),
      "DEMO-CERT-BH04",
    ),
    doc(
      14,
      "AR-01",
      maintenanceRecords[11],
      null,
      "Archived pickup battery receipt",
      "maintenance",
      "Maintenance receipt",
      "maintenance-attachments",
      "battery-ar01.pdf",
      dates.date(-500),
      null,
      "DEMO-REC-AR01-BAT",
      dates.iso(-40),
    ),
    doc(
      15,
      "EQ-LONG-001",
      null,
      null,
      "Owner manual placeholder - long equipment",
      "general",
      "Owner's manual",
      "fleet-documents",
      "manual-long-equipment.pdf",
      dates.date(-90),
      null,
      "DEMO-MAN-LONG",
    ),
    doc(
      16,
      "MD-14",
      null,
      complianceByNumber.get("DEMO-CVP-MD14"),
      "Commercial vehicle permit - MD-14",
      "compliance",
      "Vehicle permit",
      "compliance-documents",
      "permit-md14.pdf",
      dates.date(-60),
      dates.date(250),
      "DEMO-CVP-MD14",
    ),
    doc(
      17,
      "VN-08",
      null,
      complianceByNumber.get("DEMO-OP-VN08"),
      "Operating license - VN-08",
      "compliance",
      "Operating license",
      "compliance-documents",
      "operating-license-vn08.pdf",
      dates.date(-200),
      dates.date(210),
      "DEMO-OP-VN08",
    ),
    doc(
      18,
      "DT-01",
      null,
      null,
      "Demo asset photo reference",
      "asset",
      "Photo",
      "fleet-documents",
      "photo-dt01.pdf",
      dates.date(-10),
      null,
      "DEMO-PHOTO-DT01",
    ),
  ];

  return docs.map((document) => ({
    ...document,
    created_at: `${document.issue_date ?? dates.today}T12:00:00.000Z`,
    updated_at:
      document.archived_at ?? `${document.issue_date ?? dates.today}T12:00:00.000Z`,
    notes: `${document.notes ?? ""} DEMO DOCUMENT - NOT VALID.`,
    file_size: demoPdfBytes(document.document_name).length,
  }));
}

function buildDocumentVersions(documents) {
  return documents.map((document, index) => ({
    id: uuid(12000 + index + 1),
    company_id: DEMO_COMPANY_ID,
    document_id: document.id,
    version_number: 1,
    storage_bucket: document.storage_bucket,
    storage_path: document.storage_path,
    mime_type: document.mime_type,
    file_size: document.file_size,
    change_reason: "metadata_import",
    created_by: null,
  }));
}

function buildNotifications(dates, assetByUnit, rules, complianceRecords, documents) {
  const ruleByName = new Map(rules.map((rule) => [rule.name, rule]));
  const complianceByNumber = new Map(
    complianceRecords.map((record) => [record.identification_number, record]),
  );
  const docByName = new Map(
    documents.map((document) => [document.document_name, document]),
  );
  const rows = [
    [
      "maintenance_due",
      "maintenance_rule",
      ruleByName.get("Dump truck oil and filter"),
      "Dump truck oil service due soon",
      "DT-01 oil service is approaching its mileage reminder.",
      "/maintenance?status=due_soon",
      "warning",
      null,
      -1,
      null,
    ],
    [
      "maintenance_due",
      "maintenance_rule",
      ruleByName.get("Cargo van transmission service"),
      "Cargo van transmission service overdue",
      "VN-08 is past its transmission service mileage interval.",
      "/maintenance?status=overdue",
      "critical",
      null,
      -2,
      null,
    ],
    [
      "maintenance_due",
      "maintenance_rule",
      ruleByName.get("Excavator hydraulic service"),
      "Excavator hydraulic service overdue",
      "EX-12 is over its hydraulic hour interval.",
      "/maintenance?status=overdue",
      "critical",
      dates.iso(-1),
      -4,
      null,
    ],
    [
      "compliance_expiration",
      "compliance_record",
      complianceByNumber.get("DEMO-POL-DT01"),
      "Insurance expiring soon",
      "DT-01 insurance is inside the reminder window.",
      "/compliance?status=expiring",
      "warning",
      null,
      -5,
      null,
    ],
    [
      "compliance_expiration",
      "compliance_record",
      complianceByNumber.get("DEMO-INSP-MD14"),
      "Safety inspection expired",
      "MD-14 safety inspection has expired.",
      "/compliance?status=expired",
      "critical",
      null,
      -6,
      null,
    ],
    [
      "compliance_expiration",
      "compliance_requirement",
      { id: uuid(9009), asset_id: assetByUnit.get("DTL-09").id },
      "Dump trailer missing insurance",
      "DTL-09 has no current insurance record.",
      "/compliance?status=missing",
      "critical",
      null,
      -3,
      null,
    ],
    [
      "document_expiration",
      "document",
      docByName.get("Generator warranty expiring soon"),
      "Generator warranty expiring soon",
      "Generator warranty document is inside the reminder window.",
      "/documents?status=expiring",
      "warning",
      null,
      -2,
      null,
    ],
    [
      "document_expiration",
      "document",
      docByName.get("Expired safety inspection - MD-14"),
      "Inspection document expired",
      "MD-14 inspection document has expired.",
      "/documents?status=expired",
      "critical",
      dates.iso(-2),
      -10,
      null,
    ],
    [
      "general",
      "asset",
      assetByUnit.get("FB-03"),
      "Flatbed trailer fully current",
      "Resolved demo note for a trailer with current compliance.",
      "/fleet",
      "info",
      dates.iso(-20),
      -40,
      dates.iso(-12),
    ],
  ];

  return rows.map((row, index) => {
    const [
      type,
      entityType,
      entity,
      title,
      message,
      href,
      severity,
      readAt,
      createdOffset,
      resolvedAt,
    ] = row;
    return {
      id: uuid(13000 + index + 1),
      company_id: DEMO_COMPANY_ID,
      asset_id: entity?.asset_id ?? (entityType === "asset" ? entity.id : null),
      notification_type: type,
      related_entity_type: entityType,
      related_entity_id: entity.id,
      notification_key: `demo:${type}:${entityType}:${entity.id}`,
      title,
      message: `${message} DEMO DATA - NOT REAL.`,
      href,
      due_date: entity?.next_due_date ?? entity?.expiration_date ?? null,
      read_at: readAt,
      resolved_at: resolvedAt,
      severity,
      email_delivery_status: "skipped",
      email_last_attempt_at: null,
      email_sent_at: null,
      email_attempt_count: 0,
      email_error: null,
      metadata: { demo: true },
      created_at: dates.iso(createdOffset),
      last_generated_at: dates.iso(createdOffset),
      updated_at: dates.iso(createdOffset),
    };
  });
}

function buildAuditEvents(dates, documents) {
  return documents.slice(0, 5).map((document, index) => ({
    id: uuid(14000 + index + 1),
    company_id: DEMO_COMPANY_ID,
    actor_user_id: null,
    event_type: "demo_seed_created",
    entity_type: "document",
    entity_id: document.id,
    metadata: { demo: true, documentName: document.document_name },
    created_at: dates.iso(-index - 1),
  }));
}

function buildSubscriptionFixtures(dates) {
  return [
    {
      status: "active",
      plan_key: "growing_fleet",
      asset_limit: 30,
      active_asset_count: 13,
      expected: "full_access",
    },
    {
      status: "past_due",
      plan_key: "small_fleet",
      asset_limit: 15,
      active_asset_count: 13,
      expected: "read_only",
    },
    {
      status: "canceled",
      plan_key: "starter",
      asset_limit: 5,
      active_asset_count: 13,
      expected: "read_only_over_limit",
    },
    {
      status: "active",
      plan_key: "starter",
      asset_limit: 5,
      active_asset_count: 13,
      expected: "over_limit",
    },
  ].map((fixture, index) => ({
    id: uuid(15000 + index + 1),
    company_id: DEMO_COMPANY_ID,
    stripe_customer_id: `cus_demo_fixture_${fixture.status}`,
    stripe_subscription_id: `sub_demo_fixture_${fixture.status}_${index + 1}`,
    stripe_price_id: `price_demo_fixture_${fixture.plan_key}`,
    current_period_start: dates.iso(-10),
    current_period_end: dates.iso(20),
    trial_end: null,
    cancel_at_period_end: fixture.status === "canceled",
    last_payment_status: fixture.status === "past_due" ? "failed" : "succeeded",
    restricted_at: fixture.status === "active" ? null : dates.iso(-1),
    updated_from_stripe_at: dates.iso(0),
    metadata: { demo: true, fixture: fixture.expected },
    ...fixture,
  }));
}

export function getDemoResetPlan() {
  return {
    companyId: DEMO_COMPANY_ID,
    ownerEmails: [DEMO_OWNER_EMAIL, LEGACY_DEMO_OWNER_EMAIL],
    storageBuckets: [
      "asset-images",
      "maintenance-attachments",
      "compliance-documents",
      "fleet-documents",
    ],
    storagePrefix: DEMO_COMPANY_ID,
  };
}

export function summarizeDemoDataset(data) {
  return {
    company: data.company.company_name,
    assets: data.assets.length,
    activeAssets: data.assets.filter((asset) => asset.status === "active").length,
    archivedAssets: data.assets.filter((asset) => asset.status === "archived").length,
    meterReadings: data.meterReadings.length,
    maintenanceRules: data.maintenanceRules.length,
    maintenanceRecords: data.maintenanceRecords.length,
    complianceRequirements: data.complianceRequirements.length,
    complianceRecords: data.complianceRecords.length,
    documents: data.documents.length,
    notifications: data.notifications.length,
  };
}

export function demoPdfBytes(title) {
  const safeTitle = String(title).replace(/[()\\]/g, " ");
  const body = `DEMO DOCUMENT - NOT VALID\\n${safeTitle}\\nFictional FleetReady seed artifact.`;
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${body.length + 70} >>
stream
BT
/F1 18 Tf
72 720 Td
(${body}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export function demoPngBytes() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
}

function asset(
  number,
  unit_number,
  asset_name,
  asset_type,
  year,
  make,
  model,
  vin_or_serial_number,
  license_plate,
  current_mileage,
  current_engine_hours,
  purchaseOffset,
  purchase_price,
  status,
  notes,
  asset_image_path = null,
  archived_at = null,
) {
  return {
    id: uuid(number),
    company_id: DEMO_COMPANY_ID,
    unit_number,
    asset_name,
    asset_type,
    year,
    make,
    model,
    vin_or_serial_number,
    license_plate,
    current_mileage,
    current_engine_hours,
    purchase_date: purchaseOffset
      ? createDateHelpers(new Date()).date(purchaseOffset)
      : null,
    purchase_price,
    status,
    notes: `${notes} All values are fictional.`,
    asset_image_path,
    archived_at,
  };
}

function doc(
  number,
  unit,
  maintenanceRecord,
  complianceRecord,
  documentName,
  category,
  documentType,
  bucket,
  filename,
  issueDate,
  expirationDate,
  documentNumber,
  archivedAt = null,
) {
  const documentId = uuid(11000 + number);
  const assetId = unit
    ? uuid(
        [
          "DT-01",
          "MD-14",
          "PU-22",
          "VN-08",
          "FB-03",
          "DTL-09",
          "EX-12",
          "BH-04",
          "WL-17",
          "GN-02",
          "SS-05",
          "EQ-LONG-001",
          "MIN-01",
          "AR-01",
          "AR-TR-02",
        ].indexOf(unit) + 1,
      )
    : null;
  const folder =
    category === "maintenance"
      ? `maintenance/${maintenanceRecord?.id ?? documentId}`
      : category === "compliance"
        ? `compliance/${complianceRecord?.id ?? documentId}`
        : `${category}/${documentId}`;

  return {
    id: documentId,
    company_id: DEMO_COMPANY_ID,
    asset_id: assetId,
    maintenance_record_id: maintenanceRecord?.id ?? null,
    compliance_record_id: complianceRecord?.id ?? null,
    document_name: documentName,
    category,
    document_type: documentType,
    storage_bucket: bucket,
    storage_path: `${DEMO_COMPANY_ID}/${folder}/${filename}`,
    mime_type: "application/pdf",
    file_size: 0,
    issue_date: issueDate,
    expiration_date: expirationDate,
    document_number: documentNumber,
    notes: "Generated by development demo seed.",
    archived_at: archivedAt,
  };
}

function mileageSeries(asset, values, offsets, notes) {
  if (!asset) return [];
  return values.map((value, index) => ({
    asset_id: asset.id,
    reading_type: "mileage",
    reading_value: value,
    offsetDays: offsets[index],
    notes,
  }));
}

function hoursSeries(asset, values, offsets, notes) {
  if (!asset) return [];
  return values.map((value, index) => ({
    asset_id: asset.id,
    reading_type: "engine_hours",
    reading_value: value,
    offsetDays: offsets[index],
    notes,
  }));
}

function createDateHelpers(baseDate) {
  const base = new Date(baseDate);
  const baseUtc = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());
  const atOffset = (offsetDays) => new Date(baseUtc + offsetDays * dayMs);

  return {
    today: new Date(baseUtc).toISOString().slice(0, 10),
    date: (offsetDays) => atOffset(offsetDays).toISOString().slice(0, 10),
    iso: (offsetDays) => atOffset(offsetDays).toISOString(),
  };
}

function uuid(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}
