import { describe, expect, it } from "vitest";

import {
  buildEmailConfirmationRedirect,
  emailConfirmationRequiredMessage,
  getSignupCompletion,
} from "../src/features/auth/signup-flow";

describe("signup completion", () => {
  it("keeps the owner on signup when email confirmation is required", () => {
    expect(getSignupCompletion({ session: null })).toEqual({
      requiresEmailConfirmation: true,
      message: emailConfirmationRequiredMessage,
    });
  });

  it("continues to onboarding when Supabase creates a session", () => {
    expect(getSignupCompletion({ session: { access_token: "test-token" } })).toEqual({
      requiresEmailConfirmation: false,
      message: null,
    });
  });

  it("returns confirmed owners to login with their onboarding destination", () => {
    expect(
      buildEmailConfirmationRedirect(
        "https://maintly.example/",
        "/onboarding?plan=small_fleet",
      ),
    ).toBe(
      "https://maintly.example/login?confirmed=1&redirectTo=%2Fonboarding%3Fplan%3Dsmall_fleet",
    );
  });
});
