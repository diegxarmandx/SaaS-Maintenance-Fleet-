import { expect, test } from "@playwright/test";

import {
  attachPageHealthMonitor,
  expectNoHorizontalOverflow,
} from "./helpers/page-health";

const ownerRoutes = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/fleet", heading: "Fleet assets" },
  { path: "/maintenance", heading: "Maintenance" },
  { path: "/compliance", heading: "Compliance" },
  { path: "/documents", heading: "Documents" },
  { path: "/reports", heading: "Reports" },
  { path: "/settings", heading: "Settings" },
] as const;

test.describe("owner demo smoke tests", () => {
  for (const route of ownerRoutes) {
    test(`${route.path} loads in local demo mode`, async ({ page }, testInfo) => {
      const health = attachPageHealthMonitor(page, testInfo);

      const response = await page.goto(route.path);

      expect(response?.status()).toBeLessThan(400);
      await expect(
        page.getByRole("heading", { name: route.heading, exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Current company")).toContainText(
        "Northstar Fleet Services LLC",
      );
      await expectNoHorizontalOverflow(page);
      await health.assertHealthy();
    });
  }

  test("desktop owner navigation reaches core modules", async ({ page }, testInfo) => {
    const health = attachPageHealthMonitor(page, testInfo);

    await page.goto("/dashboard");
    const navigation = page.getByRole("navigation", { name: "Owner modules" });
    await expect(navigation).toBeVisible();

    await navigation.getByRole("link", { name: "Fleet" }).click();
    await expect(page).toHaveURL(/\/fleet$/);
    await expect(page.getByRole("heading", { name: "Fleet assets" })).toBeVisible();

    await navigation.getByRole("link", { name: "Maintenance" }).click();
    await expect(page).toHaveURL(/\/maintenance$/);
    await expect(
      page.getByRole("heading", { name: "Maintenance", exact: true }),
    ).toBeVisible();

    await navigation.getByRole("link", { name: "Compliance" }).click();
    await expect(page).toHaveURL(/\/compliance$/);
    await expect(
      page.getByRole("heading", { name: "Compliance", exact: true }),
    ).toBeVisible();

    await navigation.getByRole("link", { name: "Documents" }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await expect(
      page.getByRole("heading", { name: "Documents", exact: true }),
    ).toBeVisible();

    await navigation.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(
      page.getByRole("heading", { name: "Reports", exact: true }),
    ).toBeVisible();

    await navigation.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();

    await health.assertHealthy();
  });

  test("settings exposes legal links and safe account data controls", async ({
    page,
  }, testInfo) => {
    const health = attachPageHealthMonitor(page, testInfo);

    await page.goto("/settings");

    await expect(
      page.getByRole("heading", {
        name: "Legal, support, export, and deletion controls",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download JSON export" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy notice" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms of service" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Support" }).first()).toBeVisible();

    const deletionRegion = page
      .getByRole("heading", { name: "Request account and company deletion" })
      .locator("xpath=ancestor::article[1]");
    await expect(
      page.getByText(/Deletion is irreversible after processing/i),
    ).toBeVisible();
    await expect(deletionRegion.getByText(/After deletion is processed/i)).toBeVisible();
    await expect(deletionRegion.getByLabel("Company name confirmation")).toBeVisible();
    await expect(deletionRegion.getByLabel("Current password")).toBeVisible();
    await expect(
      deletionRegion.getByRole("button", { name: "Request deletion" }),
    ).toBeVisible();

    await deletionRegion.getByRole("button", { name: "Request deletion" }).click();
    await expect(
      page.getByText("Confirm the company name before requesting deletion."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);

    await health.assertHealthy();
  });
});
