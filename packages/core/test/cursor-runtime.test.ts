import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

describe("Cursor runtime evidence", () => {
  it("requires the always and matching-glob markers while preserving agent-requested observation", async () => {
    // @ts-expect-error The runtime probe is intentionally dependency-free JavaScript.
    const { evaluateRuntimeOutput } = await import("../../../scripts/verify-cursor-runtime.mjs");
    expect(evaluateRuntimeOutput("CURSOR_ALWAYS_MARKER CURSOR_TYPESCRIPT_MARKER CURSOR_REQUESTED_MARKER")).toEqual({
      deterministicMarkers: ["CURSOR_ALWAYS_MARKER", "CURSOR_TYPESCRIPT_MARKER"],
      requestedMarkerObserved: true
    });
  });

  it("uses a Cursor CLI permissions shape with an explicit allow list", async () => {
    const file = path.resolve(process.cwd(), "../../fixtures/cursor-runtime/.cursor/cli.json");
    const config = JSON.parse(await fs.readFile(file, "utf8"));
    expect(config.permissions.allow).toEqual(["Read(src/probe.ts)"]);
  });

  it("references the TypeScript probe so Cursor can attach its glob rule", async () => {
    // @ts-expect-error The runtime probe is intentionally dependency-free JavaScript.
    const { runtimePrompt } = await import("../../../scripts/verify-cursor-runtime.mjs");
    expect(runtimePrompt).toContain("Read @src/probe.ts");
  });

  it("trusts only the fixed fixture when running the Cursor CLI", async () => {
    // @ts-expect-error The runtime probe is intentionally dependency-free JavaScript.
    const { runtimeArgs } = await import("../../../scripts/verify-cursor-runtime.mjs");
    expect(runtimeArgs).toContain("--trust");
  });

  it("uses the runner temporary path only inside workflow shell steps", async () => {
    const file = path.resolve(process.cwd(), "../../.github/workflows/cursor-runtime.yml");
    const workflow = await fs.readFile(file, "utf8");
    expect(workflow).not.toContain("${{ runner.temp }}");
    expect(workflow).toContain("$RUNNER_TEMP/cursor-agent/cursor-agent");
  });
});
