import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectSecurityHeaders } from "./helpers/page-health";

const publicRoutes = [
  { path: "/", heading: /Maintenance control for small fleets/i },
  { path: "/pricing", heading: /Simple pricing for small fleets/i },
  { path: "/login", heading: "Sign in" },
  { path: "/signup", heading: "Create owner account" },
  { path: "/privacy", heading: "Privacy Notice" },
  { path: "/terms", heading: "Terms of Service" },
  { path: "/support", heading: "Owner support" },
] as const;

test.describe("public route smoke tests", () => {
  for (const route of publicRoutes) {
    test(`${route.path} loads without redirecting unexpectedly`, async ({ page }) => {
      const response = await page.goto(route.path);

      expect(response?.status()).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route.path)}$`));
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test("landing page has primary calls to action and legal navigation", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Get Started" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByText(/Last updated:/i)).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: "Terms" }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByText(/Last updated:/i)).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: "Support" }).click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(
      page.getByText(
        "Production support intake is disabled until SUPPORT_EMAIL is configured.",
      ),
    ).toBeVisible();
  });

  test("landing page hero photo loads", async ({ page }) => {
    await page.goto("/");

    const heroPhoto = page.getByRole("img", {
      name: "Small commercial fleet parked outside a maintenance garage",
    });

    await expect(heroPhoto).toBeVisible();
    await expect
      .poll(() =>
        heroPhoto.evaluate(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      )
      .toBe(true);
  });

  test("pricing page shows every tier and preserves the selected plan", async ({
    page,
  }) => {
    await page.goto("/pricing");

    await expect(
      page.getByRole("heading", { name: "Starter", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Small Fleet", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Growing Fleet", exact: true }),
    ).toBeVisible();

    const smallFleetCta = page.getByRole("link", { name: "Choose Small Fleet" });
    await expect(smallFleetCta).toHaveAttribute("href", "/signup?plan=small_fleet");
  });

  test("email confirmation return shows success and preserves onboarding destination", async ({
    page,
  }) => {
    await page.goto(
      "/login?confirmed=1&redirectTo=%2Fonboarding%3Fplan%3Dsmall_fleet",
    );

    await expect(
      page.getByText(
        "Email confirmed. Sign in to finish setting up your workspace.",
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(
      /\/login\?confirmed=1&redirectTo=%2Fonboarding%3Fplan%3Dsmall_fleet$/,
    );
  });

  test("representative routes include security headers", async ({ page }) => {
    await expectSecurityHeaders(page, "/");
    await expectSecurityHeaders(page, "/privacy");
    await expectSecurityHeaders(page, "/dashboard");
  });

  test("unknown routes render the not-found state", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-real-route");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This Maintly route is not available." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to dashboard" })).toBeVisible();
  });
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
