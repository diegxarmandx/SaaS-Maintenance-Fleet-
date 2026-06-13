import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEMO_COMPANY_ID,
  DEMO_OWNER_EMAIL,
  DEMO_OWNER_NAME,
  DEMO_PASSWORD_FALLBACK,
  LEGACY_DEMO_OWNER_EMAIL,
  assertCanRunDemoSeed,
  buildDemoDataset,
  demoPdfBytes,
  demoPngBytes,
  getDemoResetPlan,
  summarizeDemoDataset,
} from "./demo-seed-data.mjs";

loadLocalEnvFiles([".env.local", ".env"]);

const mode = process.argv[2] ?? "full";
const shouldReset = mode === "reset";
const scenario = shouldReset ? (process.argv[3] ?? "full") : mode;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_OWNER_PASSWORD ?? DEMO_PASSWORD_FALLBACK;
const metadataOnly = process.env.DEMO_SEED_METADATA_ONLY === "1";

assertCanRunDemoSeed(process.env, { reset: shouldReset });

if (!["full", "minimal", "empty"].includes(scenario)) {
  throw new Error("Demo seed scenario must be full, minimal, or empty.");
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

function loadLocalEnvFiles(fileNames) {
  for (const fileName of fileNames) {
    const filePath = resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [rawKey, ...rawValueParts] = trimmed.split("=");
      const key = rawKey.trim();
      const rawValue = rawValueParts.join("=").trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

if (shouldReset) {
  await resetDemoData();
}

if (mode !== "reset" || process.argv[3]) {
  const dataset = buildDemoDataset({ scenario });
  const ownerId = await ensureDemoOwner();
  await seedDataset(dataset, ownerId);

  if (!metadataOnly) {
    await uploadDemoFiles(dataset);
  } else {
    console.log("Skipping demo file uploads because DEMO_SEED_METADATA_ONLY=1.");
  }

  console.log("Seeded development demo data:");
  console.table(summarizeDemoDataset(dataset));
  console.log(`Demo owner: ${DEMO_OWNER_EMAIL}`);
  console.log(
    `Demo password: ${process.env.DEMO_OWNER_PASSWORD ? "from DEMO_OWNER_PASSWORD" : DEMO_PASSWORD_FALLBACK}`,
  );
}

async function ensureDemoOwner() {
  const existingProfile = await supabase
    .from("profiles")
    .select("id")
    .eq("email", DEMO_OWNER_EMAIL)
    .maybeSingle();

  if (existingProfile.error) {
    throw new Error(`profiles lookup: ${existingProfile.error.message}`);
  }

  if (existingProfile.data?.id) {
    return existingProfile.data.id;
  }

  const existingAuthUser = await findAuthUserByEmail(DEMO_OWNER_EMAIL);

  if (existingAuthUser?.id) {
    return existingAuthUser.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_OWNER_EMAIL,
    password: demoPassword,
    email_confirm: true,
    user_metadata: {
      full_name: DEMO_OWNER_NAME,
      demo_seed: true,
    },
  });

  if (error) {
    throw new Error(`auth user: ${error.message}`);
  }

  return data.user.id;
}

async function seedDataset(dataset, ownerId) {
  await upsert("companies", [dataset.company]);
  await upsert("profiles", [{ id: ownerId, ...dataset.profile }]);
  await upsert("subscription_records", [dataset.subscriptionRecord], "company_id");
  await upsert(
    "notification_preferences",
    [dataset.notificationPreference],
    "company_id",
  );
  await upsert("assets", dataset.assets);
  await upsert("report_preferences", [dataset.reportPreference], "company_id");
  await upsert("meter_readings", dataset.meterReadings);
  await upsert("maintenance_templates", dataset.maintenanceTemplates);
  await upsert("maintenance_rules", dataset.maintenanceRules);
  await upsert("maintenance_records", dataset.maintenanceRecords);
  await upsert("compliance_requirements", dataset.complianceRequirements);
  await upsert("compliance_records", dataset.complianceRecords);
  await upsert("documents", dataset.documents);
  await upsert("document_versions", dataset.documentVersions);
  await upsert("notifications", dataset.notifications);
  await upsert("audit_events", dataset.auditEvents);
}

async function upsert(table, rows, onConflict = "id") {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function resetDemoData() {
  const resetPlan = getDemoResetPlan();
  console.log(`Resetting demo company ${resetPlan.companyId}.`);

  await removeDemoStorageObjects(resetPlan);

  const { data: companyProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email")
    .eq("company_id", DEMO_COMPANY_ID);

  if (profileError) {
    throw new Error(`profiles reset lookup: ${profileError.message}`);
  }

  const { data: emailProfiles, error: emailProfileError } = await supabase
    .from("profiles")
    .select("id,email")
    .in("email", resetPlan.ownerEmails);

  if (emailProfileError) {
    throw new Error(`profiles reset email lookup: ${emailProfileError.message}`);
  }

  const { error: companyError } = await supabase
    .from("companies")
    .delete()
    .eq("id", DEMO_COMPANY_ID);

  if (companyError) {
    throw new Error(`companies reset: ${companyError.message}`);
  }

  const profileIds = new Set(
    [...(companyProfiles ?? []), ...(emailProfiles ?? [])].map((profile) => profile.id),
  );
  for (const email of [DEMO_OWNER_EMAIL, LEGACY_DEMO_OWNER_EMAIL]) {
    const user = await findAuthUserByEmail(email);
    if (user?.id) {
      profileIds.add(user.id);
    }
  }

  for (const userId of profileIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error && !error.message.toLowerCase().includes("not found")) {
      throw new Error(`delete demo auth user ${userId}: ${error.message}`);
    }
  }

  console.log("Demo reset complete. Other companies were not touched.");
}

async function removeDemoStorageObjects(resetPlan) {
  for (const bucket of resetPlan.storageBuckets) {
    const paths = await listStoragePaths(bucket, resetPlan.storagePrefix);

    if (paths.length === 0) {
      continue;
    }

    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.warn(`Storage cleanup skipped for ${bucket}: ${error.message}`);
    } else {
      console.log(`Removed ${paths.length} demo object(s) from ${bucket}.`);
    }
  }
}

async function listStoragePaths(bucket, prefix) {
  const paths = [];
  const stack = [prefix];

  while (stack.length > 0) {
    const current = stack.pop();
    const { data, error } = await supabase.storage.from(bucket).list(current, {
      limit: 1000,
    });

    if (error) {
      continue;
    }

    for (const entry of data ?? []) {
      const fullPath = `${current}/${entry.name}`;
      if (entry.id) {
        paths.push(fullPath);
      } else {
        stack.push(fullPath);
      }
    }
  }

  return paths;
}

async function uploadDemoFiles(dataset) {
  const imageAssets = dataset.assets.filter((asset) => asset.asset_image_path);

  for (const asset of imageAssets) {
    await uploadObject(
      "asset-images",
      asset.asset_image_path,
      demoPngBytes(),
      "image/png",
    );
  }

  for (const document of dataset.documents) {
    await uploadObject(
      document.storage_bucket,
      document.storage_path,
      demoPdfBytes(document.document_name),
      document.mime_type,
    );
  }
}

async function uploadObject(bucket, path, body, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.warn(
      `Demo upload skipped for ${bucket}/${path}: ${error.message}. Metadata remains seeded.`,
    );
  }
}

async function findAuthUserByEmail(email) {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(`auth list users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (match) {
      return match;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  return null;
}
