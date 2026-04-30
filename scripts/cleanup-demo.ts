import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const demoTargets = [
  "src/components/todo-list",
  "src/app/api/todos",
  "src/app/api/todos",
  "src/lib/api/todos.ts",
  "src/lib/db/schema/todos.ts",
  "src/lib/db/queries/todos.ts",
  "src/lib/db/migrations",
  "src/lib/mcp/tools",
];

const exportCleanupFiles = [
  "src/lib/api/index.ts",
  "src/lib/db/queries/index.ts",
  "src/lib/db/schema/index.ts",
];

function resolveFromRoot(relPath: string): string {
  return path.join(ROOT, relPath);
}

function removePath(relPath: string) {
  const absPath = resolveFromRoot(relPath);
  if (!existsSync(absPath)) {
    console.log(`- skip (not found): ${relPath}`);
    return;
  }

  rmSync(absPath, { recursive: true, force: true });
  console.log(`- removed: ${relPath}`);
}

function cleanupTodosExport(relPath: string) {
  const absPath = resolveFromRoot(relPath);
  if (!existsSync(absPath)) {
    console.log(`- skip export cleanup (not found): ${relPath}`);
    return;
  }

  const original = readFileSync(absPath, "utf8");
  const next = original
    .split("\n")
    .filter((line) => !/^\s*export\s+\*\s+from\s+["']\.\/todos["'];?\s*$/.test(line))
    .join("\n")
    .trimEnd();

  const finalContent = next.length > 0 ? `${next}\n` : "";
  if (finalContent !== original) {
    writeFileSync(absPath, finalContent, "utf8");
    console.log(`- cleaned exports: ${relPath}`);
  } else {
    console.log(`- no export changes: ${relPath}`);
  }
}

function main() {
  console.log("Cleaning template demo artifacts...");
  demoTargets.forEach(removePath);

  console.log("Fixing stale index exports...");
  exportCleanupFiles.forEach(cleanupTodosExport);

  console.log("Done. Demo cleanup completed.");
}

main();

