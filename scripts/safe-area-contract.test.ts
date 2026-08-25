import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("keeps the viewport edge-to-edge and exposes resolved safe-area utilities", async () => {
  const [layout, css] = await Promise.all([
    readFile(new URL("src/app/layout.tsx", ROOT), "utf8"),
    readFile(new URL("src/app/globals.css", ROOT), "utf8"),
  ]);

  expect(layout).toContain('viewportFit: "cover"');
  for (const edge of ["top", "right", "bottom", "left"]) {
    expect(css).toContain(`env(safe-area-inset-${edge}, 0px)`);
    expect(css).toContain(`var(--eazo-safe-area-${edge}, 0px)`);
    expect(css).toContain(`--safe-${edge}: max(`);
  }
  expect(css).toContain("@utility safe-pt");
  expect(css).toContain("@utility safe-pb");
  expect(css).toContain("@utility safe-px");
  expect(css).not.toMatch(
    /(?:html|body)\s*\{[^}]*padding-(?:top|bottom):\s*var\(--safe-/s,
  );
});

test("demo cleanup cannot rewrite the safe-area scaffold", async () => {
  const cleanup = await readFile(new URL("scripts/cleanup-demo.ts", ROOT), "utf8");

  expect(cleanup).not.toContain("src/app/layout.tsx");
  expect(cleanup).not.toContain("src/app/globals.css");
});
