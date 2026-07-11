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
    const report = await resolveRepository({ repositoryRoot: fixture, targetFile: "src/auth/login.ts", workingDirectory: "src/auth" });
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

  it("uses cwd rather than the target directory for Codex startup instructions", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, "src", "auth"), { recursive: true });
    await fs.writeFile(path.join(root, "AGENTS.md"), "root\n");
    await fs.writeFile(path.join(root, "src", "AGENTS.md"), "src\n");
    await fs.writeFile(path.join(root, "src", "auth", "AGENTS.md"), "auth\n");
    await fs.writeFile(path.join(root, "src", "auth", "login.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "src/auth/login.ts", workingDirectory: ".", agents: ["codex"] });
    expect(report.traces[0]?.includedSources.map(source => source.source.file)).toEqual(["AGENTS.md"]);
  });

  it("loads Codex instructions from the root through a nested cwd", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, "src", "auth"), { recursive: true });
    await fs.writeFile(path.join(root, "AGENTS.md"), "root\n");
    await fs.writeFile(path.join(root, "src", "AGENTS.md"), "src\n");
    await fs.writeFile(path.join(root, "src", "auth", "AGENTS.md"), "auth\n");
    await fs.writeFile(path.join(root, "src", "auth", "login.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "src/auth/login.ts", workingDirectory: "src/auth", agents: ["codex"] });
    expect(report.traces[0]?.includedSources.map(source => source.source.file)).toEqual(["AGENTS.md", "src/AGENTS.md", "src/auth/AGENTS.md"]);
  });

  it("reports Codex instruction byte-budget truncation", async () => {
    const root = await temporaryRepository();
    await fs.writeFile(path.join(root, "AGENTS.md"), "a".repeat(33 * 1024));
    await fs.writeFile(path.join(root, "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "index.ts", agents: ["codex"] });
    const source = report.traces[0]?.includedSources[0];
    expect(source?.metadata?.truncated).toBe(true);
    expect(source?.metadata?.loadedBytes).toBe(32 * 1024);
    expect(source?.metadata?.originalBytes).toBe(33 * 1024);
  });

  it("separates Claude startup instructions from lazy target-directory instructions", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, "src", "auth"), { recursive: true });
    await fs.writeFile(path.join(root, "CLAUDE.md"), "root\n");
    await fs.writeFile(path.join(root, "src", "CLAUDE.md"), "src\n");
    await fs.writeFile(path.join(root, "src", "auth", "login.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "src/auth/login.ts", workingDirectory: ".", agents: ["claude"] });
    const sources = report.traces[0]?.includedSources ?? [];
    expect(sources.find(source => source.source.file === "CLAUDE.md")?.loadMode).toBe("startup");
    expect(sources.find(source => source.source.file === "src/CLAUDE.md")?.loadMode).toBe("lazy");
  });

  it("does not expand Claude imports in fenced code blocks and stops circular imports", async () => {
    const root = await temporaryRepository();
    await fs.writeFile(path.join(root, "CLAUDE.md"), "```md\n@fake.md\n```\n@one.md\n");
    await fs.writeFile(path.join(root, "one.md"), "@two.md\n");
    await fs.writeFile(path.join(root, "two.md"), "@one.md\n");
    await fs.writeFile(path.join(root, "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "index.ts", agents: ["claude"] });
    const source = report.traces[0]?.includedSources[0];
    expect(source?.content).toContain("contextlens import: one.md");
    expect(source?.content).not.toContain("contextlens import: fake.md");
    expect(source?.metadata?.imports).toEqual(["one.md", "two.md"]);
  });

  it("stops Claude import expansion after four hops", async () => {
    const root = await temporaryRepository();
    await fs.writeFile(path.join(root, "CLAUDE.md"), "@one.md\n");
    await fs.writeFile(path.join(root, "one.md"), "@two.md\n");
    await fs.writeFile(path.join(root, "two.md"), "@three.md\n");
    await fs.writeFile(path.join(root, "three.md"), "@four.md\n");
    await fs.writeFile(path.join(root, "four.md"), "@five.md\n");
    await fs.writeFile(path.join(root, "five.md"), "must not expand\n");
    await fs.writeFile(path.join(root, "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "index.ts", agents: ["claude"] });
    const source = report.traces[0]?.includedSources[0];
    expect(source?.metadata?.depthLimited).toBe(true);
    expect(source?.content).not.toContain("must not expand");
  });

  it("matches Claude path rules only for matching targets", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, ".claude", "rules"), { recursive: true });
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(path.join(root, ".claude", "rules", "typescript.md"), "---\npaths: src/**/*.ts\n---\nUse TypeScript.\n");
    await fs.writeFile(path.join(root, "src", "index.ts"), "export {};\n");
    await fs.writeFile(path.join(root, "README.md"), "# Readme\n");
    const matched = await resolveRepository({ repositoryRoot: root, targetFile: "src/index.ts", agents: ["claude"] });
    const unmatched = await resolveRepository({ repositoryRoot: root, targetFile: "README.md", agents: ["claude"] });
    expect(matched.traces[0]?.includedSources.some(source => source.source.file.endsWith("typescript.md"))).toBe(true);
    expect(unmatched.traces[0]?.includedSources.some(source => source.source.file.endsWith("typescript.md"))).toBe(false);
  });

  it("honors Copilot excludeAgent for code review", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, ".github", "instructions"), { recursive: true });
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(path.join(root, ".github", "instructions", "typescript.instructions.md"), "---\napplyTo: src/**/*.ts\nexcludeAgent: code-review\n---\nCloud only.\n");
    await fs.writeFile(path.join(root, "src", "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "src/index.ts", agents: ["copilot"], copilotSurface: "code-review" });
    const source = report.traces[0]?.sources.find(item => item.source.file.endsWith("typescript.instructions.md"));
    expect(source?.matched).toBe(false);
    expect(source?.metadata?.excludedBy).toEqual(["code-review"]);
  });

  it("honors array-form Copilot excludeAgent and does not match missing applyTo", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, ".github", "instructions"), { recursive: true });
    await fs.writeFile(path.join(root, ".github", "instructions", "excluded.instructions.md"), "---\napplyTo: \"**\"\nexcludeAgent:\n  - cloud-agent\n  - code-review\n---\nExcluded.\n");
    await fs.writeFile(path.join(root, ".github", "instructions", "missing.instructions.md"), "No frontmatter.\n");
    await fs.writeFile(path.join(root, "index.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "index.ts", agents: ["copilot"], copilotSurface: "cloud-agent" });
    const sources = report.traces[0]?.sources ?? [];
    expect(sources.find(source => source.source.file.endsWith("excluded.instructions.md"))?.matched).toBe(false);
    expect(sources.find(source => source.source.file.endsWith("missing.instructions.md"))?.matched).toBe(false);
  });

  it("produces different Copilot traces for cloud agent and code review", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(path.join(root, "AGENTS.md"), "Cloud agent guidance.\n");
    await fs.writeFile(path.join(root, "src", "index.ts"), "export {};\n");
    const cloud = await resolveRepository({ repositoryRoot: root, targetFile: "src/index.ts", agents: ["copilot"], copilotSurface: "cloud-agent" });
    const review = await resolveRepository({ repositoryRoot: root, targetFile: "src/index.ts", agents: ["copilot"], copilotSurface: "code-review" });
    expect(cloud.traces[0]?.includedSources.some(source => source.source.file === "AGENTS.md")).toBe(true);
    expect(review.traces[0]?.includedSources.some(source => source.source.file === "AGENTS.md")).toBe(false);
  });

  it("rejects working directories outside the repository", async () => {
    await expect(resolveRepository({ repositoryRoot: fixture, targetFile: "README.md", workingDirectory: "../outside", agents: ["codex"] })).rejects.toThrow("Working directory must be inside");
  });

  it("normalizes Windows-style target and cwd paths", async () => {
    const root = await temporaryRepository();
    await fs.mkdir(path.join(root, "src", "auth"), { recursive: true });
    await fs.writeFile(path.join(root, "AGENTS.md"), "root\n");
    await fs.writeFile(path.join(root, "src", "AGENTS.md"), "src\n");
    await fs.writeFile(path.join(root, "src", "auth", "login.ts"), "export {};\n");
    const report = await resolveRepository({ repositoryRoot: root, targetFile: "src\\auth\\login.ts", workingDirectory: "src\\auth", agents: ["codex"] });
    expect(report.workingDirectory).toBe("src/auth");
    expect(report.schemaVersion).toBe("1.1");
  });
});
