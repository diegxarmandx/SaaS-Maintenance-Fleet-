import { expect, test } from "@playwright/test";

import {
  attachPageHealthMonitor,
  expectNoHorizontalOverflow,
} from "./helpers/page-health";

const criticalMobileRoutes = [
  "/",
  "/privacy",
  "/terms",
  "/dashboard",
  "/settings",
] as const;

test.describe("mobile smoke tests", () => {
  for (const route of criticalMobileRoutes) {
    test(`${route} has no obvious horizontal overflow`, async ({ page }, testInfo) => {
      const health = attachPageHealthMonitor(page, testInfo);

      await page.goto(route);
      await expectNoHorizontalOverflow(page);
      await health.assertHealthy();
    });
  }

  test("mobile owner navigation opens, navigates, and closes", async ({
    page,
  }, testInfo) => {
    const health = attachPageHealthMonitor(page, testInfo);

    await page.goto("/dashboard");
    const menuButton = page.getByRole("button", { name: /owner navigation/i });

    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const mobileNavigation = page.getByRole("navigation", {
      name: "Owner modules mobile",
    });
    await expect(mobileNavigation).toBeVisible();
    await mobileNavigation.getByRole("link", { name: "Fleet" }).click();
    await expect(page).toHaveURL(/\/fleet$/);
    await expect(page.getByRole("heading", { name: "Fleet assets" })).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await health.assertHealthy();
  });

  test("settings account controls remain usable on mobile", async ({
    page,
  }, testInfo) => {
    const health = attachPageHealthMonitor(page, testInfo);

    await page.goto("/settings");
    await expect(page.getByRole("link", { name: "Download JSON export" })).toBeVisible();
    await expect(page.getByLabel("Company name confirmation")).toBeVisible();
    await page.getByRole("button", { name: "Request deletion" }).click();
    await expect(
      page.getByText("Confirm the company name before requesting deletion."),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await health.assertHealthy();
  });

  test("asset Inbox tabs and upload page remain usable on mobile", async ({
    page,
  }, testInfo) => {
    const health = attachPageHealthMonitor(page, testInfo);

    await page.goto("/fleet");
    await page.getByRole("link", { name: "View asset" }).first().click();
    await page.getByRole("link", { name: /Inbox/ }).click();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("link", { name: "Upload paperwork" }).first().click();
    await expect(page.getByText(/Take a photo or upload a file/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await health.assertHealthy();
  });
});
