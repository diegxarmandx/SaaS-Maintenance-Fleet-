import { test } from "@playwright/test";

import { expectNoSeriousAccessibilityViolations } from "./helpers/accessibility";

const accessibilityRoutes = [
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/support",
  "/dashboard",
  "/settings",
] as const;

test.describe("accessibility smoke tests", () => {
  for (const route of accessibilityRoutes) {
    test(`${route} has no serious or critical axe violations`, async ({
      page,
    }, testInfo) => {
      await page.goto(route);
      await expectNoSeriousAccessibilityViolations(page, testInfo);
    });
  }

  test("asset Inbox has no serious or critical axe violations", async ({
    page,
  }, testInfo) => {
    await page.goto("/fleet");
    await page.getByRole("link", { name: "DT-01", exact: true }).first().click();
    await page.getByRole("link", { name: /Inbox/ }).click();
    await expectNoSeriousAccessibilityViolations(page, testInfo);
    await page.getByRole("link", { name: "Review item" }).click();
    await expectNoSeriousAccessibilityViolations(page, testInfo);
  });

  test("account deletion validation state has no serious or critical axe violations", async ({
    page,
  }, testInfo) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Request deletion" }).click();
    await page
      .getByText("Confirm the company name before requesting deletion.")
      .waitFor();
    await expectNoSeriousAccessibilityViolations(page, testInfo);
  });
});
