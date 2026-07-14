import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findVersionPinnedInstallCommands } from "./readme-install.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commands = findVersionPinnedInstallCommands(await readFile(path.join(root, "README.md"), "utf8"));

if (commands.length) {
  throw new Error(`README.md must use @latest or an unpinned package name: ${commands.join(", ")}`);
}

console.log("README install commands are release-safe.");
