import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = new URL("../src/", import.meta.url);
const allowedLegacyBranding = ['"X-FleetReady-Export-Schema"'];

function sourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);

    if (entry.isDirectory()) {
      return sourceFiles(child);
    }

    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : [];
  });
}

describe("Maintly branding", () => {
  it("does not expose the legacy FleetReady name in application copy", () => {
    const legacyReferences = sourceFiles(sourceRoot).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const relativePath = join("src", file.pathname.split("/src/")[1] ?? "");
      const legacyMonogram = />\s*FR\s*</.test(source) ? [`${relativePath}:FR`] : [];

      return legacyMonogram.concat(
        source
          .split("\n")
          .map((line, index) => ({ line, lineNumber: index + 1, relativePath }))
          .filter(
            ({ line }) =>
              line.includes("FleetReady") &&
              !allowedLegacyBranding.some((allowed) => line.includes(allowed)),
          )
          .map(({ lineNumber, relativePath }) => `${relativePath}:${lineNumber}`),
      );
    });

    expect(legacyReferences).toEqual([]);
  });
});
