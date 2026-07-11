import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../web/dist");
const destination = path.resolve(here, "../dist/web");
await fs.rm(destination, { recursive: true, force: true });
await fs.cp(source, destination, { recursive: true });
