import { describe, expect, it } from "vitest";

import { getAuthRedirect, isProtectedPath } from "../src/features/auth/redirects";

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
});
