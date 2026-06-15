import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../config/security-headers";

function headerMap(headers: Array<{ key: string; value: string }>) {
  return new Map(headers.map((header) => [header.key, header.value]));
}

describe("security headers", () => {
  it("defines the required application security headers", () => {
    const headers = headerMap(
      buildSecurityHeaders({
        nodeEnv: "production",
        supabaseUrl: "https://fleetready-test.supabase.co",
      }),
    );

    expect(headers.get("Content-Security-Policy")).toBeTruthy();
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets HSTS only in production", () => {
    const productionHeaders = headerMap(buildSecurityHeaders({ nodeEnv: "production" }));
    const developmentHeaders = headerMap(
      buildSecurityHeaders({ nodeEnv: "development" }),
    );

    expect(productionHeaders.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(developmentHeaders.has("Strict-Transport-Security")).toBe(false);
  });

  it("builds a readable CSP with frame protection and approved Supabase sources", () => {
    const csp = buildContentSecurityPolicy({
      isProduction: true,
      supabaseUrl: "https://fleetready-test.supabase.co",
    });

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("object-src 'self' https://fleetready-test.supabase.co");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("connect-src 'self' https://fleetready-test.supabase.co");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("keeps development allowances out of production", () => {
    const productionCsp = buildContentSecurityPolicy({
      isProduction: true,
      supabaseUrl: "https://fleetready-test.supabase.co",
    });
    const developmentCsp = buildContentSecurityPolicy({
      isProduction: false,
      supabaseUrl: "https://fleetready-test.supabase.co",
    });

    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(productionCsp).not.toContain("http://localhost:*");
    expect(developmentCsp).toContain("'unsafe-eval'");
    expect(developmentCsp).toContain("ws:");
  });
});
