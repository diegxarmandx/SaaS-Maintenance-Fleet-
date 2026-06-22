import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import {
  getAuthRedirect,
  getPostLoginRedirect,
  isProtectedPath,
  normalizeProtectedRedirect,
} from "../src/features/auth/redirects";
import { config as proxyConfig } from "../src/proxy";

describe("authentication redirects", () => {
  it("treats owner app routes as protected", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("redirects anonymous owners to login for protected routes", () => {
    expect(
      getAuthRedirect({
        pathname: "/fleet",
        isAuthenticated: false,
        onboardingStatus: null,
        hasCompany: false,
      }),
    ).toBe("/login?redirectTo=%2Ffleet");
  });

  it("redirects signed-in incomplete owners to onboarding", () => {
    expect(
      getAuthRedirect({
        pathname: "/dashboard",
        isAuthenticated: true,
        onboardingStatus: "incomplete",
        hasCompany: false,
      }),
    ).toBe("/onboarding");
  });

  it("redirects onboarded owners away from login", () => {
    expect(
      getAuthRedirect({
        pathname: "/login",
        isAuthenticated: true,
        onboardingStatus: "complete",
        hasCompany: true,
      }),
    ).toBe("/dashboard");
  });

  it("redirects authenticated onboarded owners away from the public landing page", () => {
    expect(
      getAuthRedirect({
        pathname: "/",
        isAuthenticated: true,
        onboardingStatus: "complete",
        hasCompany: true,
      }),
    ).toBe("/dashboard");
  });

  it("redirects authenticated incomplete owners from the public landing page to onboarding", () => {
    expect(
      getAuthRedirect({
        pathname: "/",
        isAuthenticated: true,
        onboardingStatus: "incomplete",
        hasCompany: false,
      }),
    ).toBe("/onboarding");
  });

  it("preserves safe protected destinations after login", () => {
    expect(
      getPostLoginRedirect({
        onboardingStatus: "complete",
        hasCompany: true,
        redirectTo: "/fleet?status=active",
      }),
    ).toBe("/fleet?status=active");
  });

  it("sends incomplete owners to onboarding after login even with a requested destination", () => {
    expect(
      getPostLoginRedirect({
        onboardingStatus: "incomplete",
        hasCompany: false,
        redirectTo: "/fleet",
      }),
    ).toBe("/onboarding");
  });

  it("rejects unsafe or public login redirect destinations", () => {
    expect(normalizeProtectedRedirect("https://example.com/fleet")).toBe("/dashboard");
    expect(normalizeProtectedRedirect("//example.com/fleet")).toBe("/dashboard");
    expect(normalizeProtectedRedirect("/login")).toBe("/dashboard");
  });

  it("keeps public image assets outside the authentication proxy", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config: proxyConfig,
        url: "https://maintly.example/images/fleetready-industrial-yard.png",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config: proxyConfig,
        url: "https://maintly.example/dashboard",
      }),
    ).toBe(true);
  });
});
