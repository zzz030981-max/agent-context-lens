import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = JSON.parse(await fs.readFile(path.join(root, "apps", "cli", "package.json"), "utf8"));
const run = (command, args, options = {}) => process.platform === "win32"
  ? execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], options)
  : execFileSync(command, args, options);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const runNpm = (args, options) => run(npm, args, options);
const pack = JSON.parse(runNpm(["pack", "-w", "agent-context-lens", "--json"], { cwd: root, encoding: "utf8" }))[0];
const tarball = path.join(root, pack.filename);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "contextlens-pack-"));
const binName = process.platform === "win32" ? "contextlens.cmd" : "contextlens";
try {
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "contextlens-smoke", private: true }));
  runNpm(["install", tarball, "--no-fund", "--no-audit"], { cwd: temp, stdio: "inherit" });
  const bin = path.join(temp, "node_modules", ".bin", binName);
  const fixture = path.join(root, "fixtures", "conflicting-rules");
  const output = run(bin, ["--version"], { cwd: temp, encoding: "utf8" }).trim();
  if (output !== cli.version) throw new Error(`Installed CLI version mismatch: ${output}`);
  const help = run(bin, ["--help"], { cwd: temp, encoding: "utf8" });
  if (!help.includes("--cwd") || !help.includes("--copilot-base-root") || help.includes("ide-chat")) throw new Error("Installed CLI help is incomplete or stale.");
  const json = run(bin, ["inspect", fixture, "--file", "src/auth/login.ts", "--cwd", ".", "--agent", "all", "--json"], { cwd: temp, encoding: "utf8" });
  if (JSON.parse(json).schemaVersion !== "1.1") throw new Error("Installed CLI did not emit schema 1.1.");
  for (const args of [["inspect", fixture, "--agent", "invalid"], ["inspect", fixture, "--cwd", "../outside"], ["inspect", fixture, "--file", "../outside.ts"]]) {
    try { run(bin, args, { cwd: temp, stdio: "ignore" }); throw new Error(`Expected failure: ${args.join(" ")}`); } catch (error) { if (error.message.startsWith("Expected failure")) throw error; }
  }
} finally {
  await fs.rm(temp, { recursive: true, force: true });
  await fs.rm(tarball, { force: true });
}
