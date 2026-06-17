import { expect, type Page, type TestInfo } from "@playwright/test";

type HealthMonitor = {
  assertHealthy: () => Promise<void>;
};

const ignoredConsoleErrorPatterns = [
  /favicon\.ico/i,
  /ResizeObserver loop completed/i,
];

const rawErrorPattern =
  /(Unhandled Runtime Error|TypeError:|ReferenceError:|SyntaxError:|PostgREST|Supabase server configuration|duplicate key|violates .*constraint|stack trace|at\s+\w+\s+\(|NEXT_REDIRECT|DATABASE_URL)/i;

export function attachPageHealthMonitor(page: Page, testInfo: TestInfo): HealthMonitor {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();

    if (ignoredConsoleErrorPatterns.some((pattern) => pattern.test(text))) {
      return;
    }

    consoleErrors.push(text);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const url = request.url();

    if (!isFirstPartyUrl(page, url) || failure?.errorText.includes("ERR_ABORTED")) {
      return;
    }

    failedRequests.push(`${request.method()} ${url}: ${failure?.errorText ?? "failed"}`);
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();

    if (!isFirstPartyUrl(page, url) || status < 500) {
      return;
    }

    badResponses.push(`${status} ${url}`);
  });

  return {
    async assertHealthy() {
      const visibleText = await page.locator("body").innerText().catch(() => "");

      await testInfo.attach("browser-health", {
        body: JSON.stringify(
          { pageErrors, consoleErrors, failedRequests, badResponses },
          null,
          2,
        ),
        contentType: "application/json",
      });

      expect(pageErrors, "uncaught page errors").toEqual([]);
      expect(consoleErrors, "console errors").toEqual([]);
      expect(failedRequests, "failed first-party requests").toEqual([]);
      expect(badResponses, "first-party 5xx responses").toEqual([]);
      expect(visibleText, "visible raw backend or stack trace text").not.toMatch(
        rawErrorPattern,
      );
    },
  };
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;

    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow, "page should not overflow horizontally").toBeLessThanOrEqual(1);
}

export async function expectSecurityHeaders(page: Page, path = "/") {
  const response = await page.request.get(path);
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["strict-transport-security"]).toBeUndefined();
}

function isFirstPartyUrl(page: Page, value: string) {
  try {
    const requestUrl = new URL(value);
    const currentUrl = new URL(page.url());

    return requestUrl.origin === currentUrl.origin;
  } catch {
    return false;
  }
}
