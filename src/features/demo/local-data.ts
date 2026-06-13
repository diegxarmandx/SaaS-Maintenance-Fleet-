import {
  DEMO_COMPANY_ID,
  DEMO_COMPANY_NAME,
  DEMO_OWNER_EMAIL,
  DEMO_OWNER_NAME,
  DEMO_TIMEZONE,
  buildDemoDataset,
} from "../../../scripts/demo-seed-data.mjs";

const localDemoDataset = buildDemoDataset({ scenario: "full" });

export function getLocalDemoDataset() {
  return localDemoDataset;
}

export const localDemoIdentity = {
  companyId: DEMO_COMPANY_ID,
  companyName: DEMO_COMPANY_NAME,
  ownerName: DEMO_OWNER_NAME,
  ownerEmail: DEMO_OWNER_EMAIL,
  timezone: DEMO_TIMEZONE,
};
