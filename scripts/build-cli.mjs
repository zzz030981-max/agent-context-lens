import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "apps", "cli");

await rm(path.join(cli, "dist"), { recursive: true, force: true });
await build({
  entryPoints: [path.join(cli, "src", "index.ts")],
  outfile: path.join(cli, "dist", "index.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  sourcemap: true,
  external: ["commander", "express", "fast-glob", "gray-matter", "minimatch", "open", "picocolors"]
});
