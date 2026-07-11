import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const output = execFileSync(npm, ["pack", "-w", "agent-context-lens", "--json"], { cwd: root, encoding: "utf8" });
const pack = JSON.parse(output)[0];
if (!pack?.filename) throw new Error("npm pack did not return a filename");
const tarball = path.join(root, pack.filename);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "contextlens-pack-"));
try {
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "contextlens-smoke", private: true }));
  execFileSync(npm, ["install", tarball, "--no-fund", "--no-audit"], { cwd: temp, stdio: "inherit" });
  const bin = path.join(temp, "node_modules", ".bin", process.platform === "win32" ? "contextlens.cmd" : "contextlens");
  const fixture = path.join(root, "fixtures", "conflicting-rules");
  execFileSync(bin, ["inspect", fixture, "--file", "src/auth/login.ts", "--agent", "codex"], { cwd: temp, stdio: "inherit" });
} finally {
  await fs.rm(temp, { recursive: true, force: true });
  await fs.rm(tarball, { force: true });
}
