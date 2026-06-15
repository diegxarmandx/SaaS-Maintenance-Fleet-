import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginPageSource = readFileSync(
  new URL("../src/app/(auth)/login/page.tsx", import.meta.url),
  "utf8",
);

const signupPageSource = readFileSync(
  new URL("../src/app/(auth)/signup/page.tsx", import.meta.url),
  "utf8",
);

describe("auth page navigation", () => {
  it("lets owners return from login and signup to the landing page", () => {
    expect(loginPageSource).toContain('href="/"');
    expect(loginPageSource).toContain("Back to landing page");
    expect(signupPageSource).toContain('href="/"');
    expect(signupPageSource).toContain("Back to landing page");
  });
});
