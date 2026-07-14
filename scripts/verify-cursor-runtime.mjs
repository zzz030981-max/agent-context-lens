import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const deterministicMarkers = ["CURSOR_ALWAYS_MARKER", "CURSOR_TYPESCRIPT_MARKER"];
export const runtimePrompt = "Read @src/probe.ts, then return only a JSON array containing the exact uppercase marker tokens supplied by active project rules. Do not read any other files, write files, or run commands.";
export const runtimeArgs = ["--trust", "-p", runtimePrompt, "--output-format", "json"];

export function evaluateRuntimeOutput(output) {
  const observed = deterministicMarkers.filter(marker => output.includes(marker));
  if (observed.length !== deterministicMarkers.length) throw new Error(`Cursor did not expose every deterministic marker: ${observed.join(", ") || "none"}.`);
  return {
    deterministicMarkers: observed,
    requestedRuleObservation: {
      status: output.includes("CURSOR_REQUESTED_MARKER") ? "observed" : "not-observed",
      marker: "CURSOR_REQUESTED_MARKER",
      scope: "single-run",
      effectOnEffectiveContext: "none"
    }
  };
}

function run() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const binary = process.env.CURSOR_AGENT_BIN ?? "cursor-agent";
  const fixture = path.join(root, "fixtures", "cursor-runtime");
  const version = execFileSync(binary, ["--version"], { encoding: "utf8" }).trim();
  const result = spawnSync(binary, runtimeArgs, { cwd: fixture, encoding: "utf8", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Cursor runtime probe failed.");
  const output = result.stdout;
  console.log(JSON.stringify({
    cursorVersion: version,
    ...evaluateRuntimeOutput(output),
    fixtureTarget: "src/probe.ts",
    requestedRulesRemainNondeterministic: true,
    promptSha256: crypto.createHash("sha256").update(runtimePrompt).digest("hex"),
    outputSha256: crypto.createHash("sha256").update(output).digest("hex")
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run();
