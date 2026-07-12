import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const core = path.join(root, "packages", "core");
const dist = path.join(core, "dist");

await rm(dist, { recursive: true, force: true });
await build({
  entryPoints: [path.join(core, "src", "index.ts")],
  outfile: path.join(dist, "index.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  sourcemap: true,
  packages: "external"
});
execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", path.join(core, "tsconfig.build.json")], { cwd: root, stdio: "inherit" });
