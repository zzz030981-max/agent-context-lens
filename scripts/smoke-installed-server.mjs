import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (command, args, options = {}) => process.platform === "win32"
  ? execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], options)
  : execFileSync(command, args, options);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const pack = JSON.parse(run(npm, ["pack", "-w", "agent-context-lens", "--json"], { cwd: root, encoding: "utf8" }))[0];
const tarball = path.join(root, pack.filename);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "contextlens-server-"));
const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close(() => resolve(value)); }); });
const bin = path.join(temp, "node_modules", ".bin", process.platform === "win32" ? "contextlens.cmd" : "contextlens");
let child;
try {
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "contextlens-server-smoke", private: true }));
  run(npm, ["install", tarball, "--no-fund", "--no-audit"], { cwd: temp, stdio: "inherit" });
  const fixture = path.join(root, "fixtures", "conflicting-rules");
  child = spawn(bin, ["serve", fixture, "--file", "README.md", "--cwd", ".", "--port", String(port), "--no-open"], { cwd: temp, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 10000;
  while (true) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error("Installed server did not become ready.");
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const home = await fetch(base); const files = await fetch(`${base}/api/files`); const report = await fetch(`${base}/api/report?file=README.md&cwd=.&agent=all`); const outside = await fetch(`${base}/api/report?file=README.md&cwd=../outside&agent=all`);
  if (!(await home.text()).includes("root")) throw new Error("Installed server did not serve the application root.");
  if (!Array.isArray(await files.json())) throw new Error("Installed server files API is invalid.");
  const body = await report.json(); if (body.schemaVersion !== "1.1" || body.workingDirectory !== ".") throw new Error("Installed server report API is invalid.");
  if (outside.status !== 400) throw new Error("Installed server accepted an outside cwd.");
} finally {
  child?.kill();
  await fs.rm(temp, { recursive: true, force: true });
  await fs.rm(tarball, { force: true });
}
