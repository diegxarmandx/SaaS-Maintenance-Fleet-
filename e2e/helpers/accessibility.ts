import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

export async function expectNoSeriousAccessibilityViolations(
  page: Page,
  testInfo: TestInfo,
) {
  const results = await new AxeBuilder({ page }).analyze();
  const blockingViolations = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  const moderateViolations = results.violations.filter(
    (violation) => violation.impact === "moderate",
  );

  if (moderateViolations.length > 0) {
    await testInfo.attach("axe-moderate-violations", {
      body: JSON.stringify(
        moderateViolations.map((violation) => ({
          id: violation.id,
          help: violation.help,
          nodes: violation.nodes.map((node) => node.target),
        })),
        null,
        2,
      ),
      contentType: "application/json",
    });
  }

  expect(
    blockingViolations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}
