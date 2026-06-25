import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pricingPageSource = readFileSync(
  new URL("../src/app/pricing/page.tsx", import.meta.url),
  "utf8",
);
const plansSource = readFileSync(
  new URL("../src/features/billing/plans.ts", import.meta.url),
  "utf8",
);

describe("public pricing page", () => {
  it("renders every subscription tier from the shared billing catalog", () => {
    expect(pricingPageSource).toContain("subscriptionPlans.map");
    expect(plansSource).toContain('name: "Free"');
    expect(plansSource).toContain('name: "Starter"');
    expect(plansSource).toContain('name: "Small Fleet"');
    expect(plansSource).toContain('name: "Growing Fleet"');
    expect(plansSource).toContain("assetLimit: 1");
    expect(plansSource).toContain("assetLimit: 5");
    expect(plansSource).toContain("assetLimit: 15");
    expect(plansSource).toContain("assetLimit: 30");
  });

  it("keeps plan selection attached to account creation and Stripe billing", () => {
    expect(pricingPageSource).toContain("/signup?plan=");
    expect(pricingPageSource).toContain("/login?redirectTo=");
    expect(pricingPageSource).toContain("Stripe Price ID");
    expect(plansSource).toContain("stripePriceId:");
  });

  it("makes Free the non-Stripe entry plan and describes Starter as 2 to 5 assets", () => {
    expect(plansSource).toContain('key: "free"');
    expect(plansSource).toContain('suggestedMonthlyPrice: "$0/mo"');
    expect(plansSource).toContain('assetRangeLabel: "1 active asset"');
    expect(plansSource).toContain('assetRangeLabel: "2-5 active assets"');
    expect(plansSource).toContain("requiresStripe: false");
  });
});
