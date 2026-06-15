import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getSupportContact } from "../src/features/legal/support";

const privacyPageSource = readFileSync(
  new URL("../src/app/privacy/page.tsx", import.meta.url),
  "utf8",
);
const termsPageSource = readFileSync(
  new URL("../src/app/terms/page.tsx", import.meta.url),
  "utf8",
);
const supportPageSource = readFileSync(
  new URL("../src/app/support/page.tsx", import.meta.url),
  "utf8",
);
const settingsPageSource = readFileSync(
  new URL("../src/app/(owner)/settings/page.tsx", import.meta.url),
  "utf8",
);
const appShellSource = readFileSync(
  new URL("../src/components/app-shell/app-shell.tsx", import.meta.url),
  "utf8",
);
const exportRouteSource = readFileSync(
  new URL("../src/app/(owner)/settings/export/route.ts", import.meta.url),
  "utf8",
);

describe("legal and support launch controls", () => {
  it("provides public privacy, terms, and support routes", () => {
    expect(privacyPageSource).toContain("Privacy Notice");
    expect(termsPageSource).toContain("Terms of Service");
    expect(supportPageSource).toContain("Owner support");
  });

  it("uses a safe fallback when support email is missing", () => {
    const support = getSupportContact(undefined);

    expect(support.configured).toBe(false);
    expect(support.mailtoHref).toBeNull();
    expect(support.statusMessage).toContain("SUPPORT_EMAIL");
  });

  it("builds configured support mailto links", () => {
    const support = getSupportContact("support@example.test");

    expect(support).toMatchObject({
      configured: true,
      email: "support@example.test",
      mailtoHref: "mailto:support@example.test",
    });
  });

  it("links legal and support controls from settings and the owner menu", () => {
    expect(settingsPageSource).toContain("AccountDataSettings");
    expect(appShellSource).toContain('href="/support"');
    expect(appShellSource).toContain('href="/privacy"');
    expect(appShellSource).toContain('href="/terms"');
  });

  it("requires the owner context before serving account data exports", () => {
    expect(exportRouteSource).toContain("getOwnerDatabaseContext");
    expect(exportRouteSource).toContain("buildLiveOwnerDataExport");
    expect(exportRouteSource).toContain("toSafeActionError");
  });
});
