import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const files = ["package.json", "apps/cli/package.json", "apps/web/package.json", "packages/core/package.json"];
const packages = await Promise.all(files.map(async file => [file, JSON.parse(await readFile(path.join(root, file), "utf8"))]));
const expected = packages[0][1].version;
const mismatches = packages.filter(([, pkg]) => pkg.version !== expected).map(([file, pkg]) => `${file}: ${pkg.version}`);
const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
for (const [file, pkg] of packages) {
  const lockPath = file === "package.json" ? undefined : file.replace(/\/package\.json$/, "");
  const lockVersion = lockPath ? lock.packages?.[lockPath]?.version : lock.version;
  if (lockVersion !== expected) mismatches.push(`package-lock.json (${file}): ${lockVersion ?? "missing"}`);
  for (const dependency of ["@agent-context-lens/core"]) {
    if (pkg.dependencies?.[dependency] && pkg.dependencies[dependency] !== expected) mismatches.push(`${file} ${dependency}: ${pkg.dependencies[dependency]}`);
    if (pkg.devDependencies?.[dependency] && pkg.devDependencies[dependency] !== expected) mismatches.push(`${file} ${dependency}: ${pkg.devDependencies[dependency]}`);
  }
}
if (mismatches.length) throw new Error(`Version mismatch (expected ${expected}):\n${mismatches.join("\n")}`);
console.log(`All workspace versions are ${expected}.`);
