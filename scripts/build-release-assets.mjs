import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(root, process.env.RELEASE_OUTPUT_DIR ?? "release");
const pkg = JSON.parse(await readFile(path.join(root, "apps", "cli", "package.json"), "utf8"));
const sourceArchive = `agent-context-lens-v${pkg.version}-source.zip`;

function run(command, args) {
  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], { cwd: root, stdio: "inherit" });
  } else {
    execFileSync(command, args, { cwd: root, stdio: "inherit" });
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
run("git", ["archive", "--format=zip", `--output=${path.join(output, sourceArchive)}`, "HEAD"]);
run(process.platform === "win32" ? "npm.cmd" : "npm", ["pack", "-w", "agent-context-lens", "--pack-destination", output]);

const assets = (await readdir(output)).filter(file => file !== "SHA256SUMS").sort();
if (!assets.includes(sourceArchive) || !assets.includes(`agent-context-lens-${pkg.version}.tgz`)) {
  throw new Error(`Unexpected release assets: ${assets.join(", ")}`);
}
const sums = await Promise.all(assets.map(async file => `${createHash("sha256").update(await readFile(path.join(output, file))).digest("hex")}  ${file}`));
await writeFile(path.join(output, "SHA256SUMS"), `${sums.join("\n")}\n`);
console.log(`Prepared ${assets.length} release assets in ${output}`);
