import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveRepository } from "../src/index.js";

const fixture = path.resolve(process.cwd(), "../../fixtures/conflicting-rules");
const temporaryRoots: string[] = [];

async function temporaryRepository(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextlens-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe("resolveRepository", () => {
  it("resolves all four agents and finds the intentional package-manager conflict", async () => {
    const report = await resolveRepository({ repositoryRoot: fixture, targetFile: "src/auth/login.ts" });
    expect(report.traces).toHaveLength(4);
    expect(report.traces.find(t => t.agent === "codex")?.includedSources.length).toBeGreaterThanOrEqual(2);
    expect(report.traces.some(t => t.findings.some(f => f.kind === "conflict"))).toBe(true);
  });

  it("does not include non-matching path rules", async () => {
    const report = await resolveRepository({ repositoryRoot: fixture, targetFile: "README.md", agents: ["cursor", "copilot", "claude"] });
    for (const trace of report.traces) expect(trace.includedSources.every(source => source.matched)).toBe(true);
  });

  it("uses AGENTS.override.md instead of AGENTS.md in the same Codex directory", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(path.join(root, "AGENTS.md"), "Use npm.\n");
    await fs.writeFile(path.join(root, "AGENTS.override.md"), "Use pnpm.\n");
    await fs.writeFile(path.join(root, "src", "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "src/index.ts", agents: ["codex"] });
    const sources = report.traces[0]?.includedSources ?? [];
    expect(sources.map(source => source.source.file)).toEqual(["AGENTS.override.md"]);
    expect(sources[0]?.content).toContain("pnpm");
  });

  it("expands Claude imports and applies matching path rules", async () => {
    const report = await resolveRepository({ repositoryRoot: fixture, targetFile: "src/auth/login.ts", agents: ["claude"] });
    const trace = report.traces[0];
    expect(trace?.includedSources.find(source => source.source.file === "CLAUDE.md")?.normalizedContent).toContain("Use npm");
    expect(trace?.includedSources.some(source => source.source.file === ".claude/rules/auth.md")).toBe(true);
  });

  it("keeps Cursor rules without deterministic triggers out of effective context", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, ".cursor", "rules"), { recursive: true });
    await fs.writeFile(path.join(root, ".cursor", "rules", "manual.mdc"), "Only use when relevant.\n");
    await fs.writeFile(path.join(root, "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "index.ts", agents: ["cursor"] });
    expect(report.traces[0]?.sources).toHaveLength(1);
    expect(report.traces[0]?.includedSources).toHaveLength(0);
    expect(report.traces[0]?.sources[0]?.loadMode).toBe("manual");
  });

  it("uses only the nearest AGENTS.md for Copilot agent instructions", async () => {
    const report = await resolveRepository({ repositoryRoot: fixture, targetFile: "src/auth/login.ts", agents: ["copilot"] });
    const agentFiles = report.traces[0]?.includedSources.filter(source => source.source.file.endsWith("AGENTS.md"));
    expect(agentFiles?.map(source => source.source.file)).toEqual(["src/AGENTS.md"]);
  });

  it("does not mistake evidence labels for file paths", async () => {
    const root = await temporaryRepository();
    await fs.writeFile(path.join(root, "AGENTS.md"), "Keep behavior documented or inferred/unknown.\n");
    await fs.writeFile(path.join(root, "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "index.ts", agents: ["codex"] });
    expect(report.traces[0]?.findings.some(finding => finding.kind === "broken-reference")).toBe(false);
  });

  it("rejects target paths outside the repository", async () => {
    await expect(resolveRepository({ repositoryRoot: fixture, targetFile: "../outside.ts", agents: ["codex"] })).rejects.toThrow("inside the repository root");
  });
});
