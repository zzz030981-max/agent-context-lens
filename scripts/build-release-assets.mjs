import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(root, process.env.RELEASE_OUTPUT_DIR ?? "release");
const pkg = JSON.parse(await readFile(path.join(root, "apps", "cli", "package.json"), "utf8"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, options = {}) => process.platform === "win32"
  ? execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], { cwd: root, ...options })
  : execFileSync(command, args, { cwd: root, ...options });

run("node", ["scripts/check-versions.mjs"]);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const sourceArchive = `agent-context-lens-v${pkg.version}-source.zip`;
const tarball = `agent-context-lens-${pkg.version}.tgz`;
const sbom = `agent-context-lens-v${pkg.version}.spdx.json`;
const notes = "release-notes.md";
run("git", ["archive", "--format=zip", `--output=${path.join(output, sourceArchive)}`, "HEAD"]);
run(npm, ["pack", "-w", "agent-context-lens", "--pack-destination", output]);
await writeFile(path.join(output, sbom), run(npm, ["sbom", "--workspace", "agent-context-lens", "--sbom-format", "spdx", "--package-lock-only"], { encoding: "utf8" }));
await writeFile(path.join(output, notes), `# Agent Context Lens v${pkg.version}\n\n## Highlights\n\n- Hardened working-directory, Copilot code-review base-root, and symbolic-link containment behavior.\n- Added package, installed CLI, loopback server, release-asset, and cross-platform CI gates.\n- Report schema remains v1.1; package version is independent.\n\n## Upgrade notes\n\nSee https://github.com/zzz030981-max/agent-context-lens/blob/main/docs/MIGRATION-0.2.md. Cursor semantic selection remains inferred/manual.\n`);
JSON.parse(await readFile(path.join(output, sbom), "utf8"));
if (!(await readFile(path.join(output, notes), "utf8")).trim()) throw new Error("Release notes must not be empty.");
if (process.platform === "win32") run("tar", ["-tf", path.join(output, sourceArchive)], { stdio: "ignore" });
else run("unzip", ["-t", path.join(output, sourceArchive)], { stdio: "ignore" });
run("tar", ["-tf", path.join(output, tarball)], { stdio: "ignore" });
const assets = (await readdir(output)).filter(file => file !== "SHA256SUMS").sort();
for (const file of [sourceArchive, tarball, sbom, notes]) if (!assets.includes(file)) throw new Error(`Missing release asset: ${file}`);
const sums = await Promise.all(assets.map(async file => `${createHash("sha256").update(await readFile(path.join(output, file))).digest("hex")}  ${file}`));
await writeFile(path.join(output, "SHA256SUMS"), `${sums.join("\n")}\n`);
console.log(`Prepared ${assets.length} release assets in ${output}`);
