import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const cli = JSON.parse(await readFile(path.join(root, "apps", "cli", "package.json"), "utf8"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, options = {}) => process.platform === "win32"
  ? execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], { cwd: root, ...options })
  : execFileSync(command, args, { cwd: root, ...options });
const pack = JSON.parse(run(npm, ["pack", "-w", "agent-context-lens", "--json"], { encoding: "utf8" }))[0];
if (pack.filename !== `agent-context-lens-${cli.version}.tgz` || !pack.size || pack.unpackedSize > 15 * 1024 * 1024) throw new Error("Unexpected tarball name or size.");
const tarball = path.join(root, pack.filename);
const temp = await mkdtemp(path.join(os.tmpdir(), "contextlens-package-"));
try {
  run("tar", ["-xf", tarball, "-C", temp]);
  const packageRoot = path.join(temp, "package");
  const files = run("tar", ["-tf", tarball], { encoding: "utf8" }).trim().split(/\r?\n/);
  for (const required of ["package/package.json", "package/README.md", "package/LICENSE", "package/dist/index.js", "package/dist/web/index.html"]) if (!files.includes(required)) throw new Error(`Missing packaged file: ${required}`);
  for (const forbidden of ["src/", "test/", "fixtures/", ".github/", ".env", "node_modules/", "release/"]) if (files.some(file => file.includes(forbidden))) throw new Error(`Forbidden packaged file: ${forbidden}`);
  const packaged = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  for (const field of ["name", "version", "bin", "engines", "license", "repository", "bugs", "homepage", "publishConfig"]) if (!packaged[field]) throw new Error(`Missing package field: ${field}`);
  if (Object.keys(packaged.scripts ?? {}).some(name => ["preinstall", "install", "postinstall"].includes(name))) throw new Error("Package must not define install lifecycle scripts.");
  const content = await readFile(path.join(packageRoot, "dist", "index.js"), "utf8");
  if (!content.startsWith("#!/usr/bin/env node")) throw new Error("dist/index.js must retain its Node shebang.");
  for (const marker of ["/mnt/data", "C:\\Users\\", "packages.hub", "artifactory"]) if (content.includes(marker)) throw new Error(`Forbidden package content: ${marker}`);
  for (const secret of [/\bghp_[A-Za-z0-9]{20,}\b/, /\bnpm_[A-Za-z0-9]{20,}\b/, /\bsk-[A-Za-z0-9_-]{20,}\b/]) if (secret.test(content)) throw new Error(`Forbidden package content: ${secret}`);
  console.log(JSON.stringify({ filename: pack.filename, size: pack.size, unpackedSize: pack.unpackedSize, files }, null, 2));
} finally {
  await rm(temp, { recursive: true, force: true });
  await rm(tarball, { force: true });
}
