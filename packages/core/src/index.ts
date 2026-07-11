import path from "node:path";
import fs from "node:fs/promises";
import type { AgentAdapter, AgentId, AgentTrace, RepositoryReport, ResolveOptions } from "./types.js";
import { codexAdapter } from "./adapters/codex.js";
import { claudeAdapter } from "./adapters/claude.js";
import { cursorAdapter } from "./adapters/cursor.js";
import { copilotAdapter } from "./adapters/copilot.js";
import { estimateTokens, resolveRepositoryPath, resolveSafeRepositoryPath, toPosix } from "./utils.js";
import { findConflicts } from "./analyzers/conflicts.js";
import { findDuplicates } from "./analyzers/duplicates.js";
import { findBrokenReferences } from "./analyzers/references.js";
import { findSecurityIssues } from "./analyzers/security.js";
import { findBudgetIssues } from "./analyzers/budget.js";

export * from "./types.js";

const adapters: Record<AgentId, AgentAdapter> = {
  codex: codexAdapter,
  claude: claudeAdapter,
  cursor: cursorAdapter,
  copilot: copilotAdapter
};

export const supportedAgents = Object.keys(adapters) as AgentId[];

export async function resolveRepository(options: ResolveOptions): Promise<RepositoryReport> {
  const configuredRoot = path.resolve(options.repositoryRoot);
  const stat = await fs.stat(configuredRoot);
  if (!stat.isDirectory()) throw new Error(`Repository root is not a directory: ${configuredRoot}`);
  const root = await fs.realpath(configuredRoot);
  const targetAbsolute = resolveRepositoryPath(root, options.targetFile);
  await resolveSafeRepositoryPath(root, targetAbsolute, { mustExist: false }).catch(error => {
    throw new Error(`Target file must be inside the repository root: ${error instanceof Error ? error.message : String(error)}`);
  });
  const targetRelative = toPosix(path.relative(root, targetAbsolute));
  const workingDirectoryAbsolute = resolveRepositoryPath(root, options.workingDirectory ?? ".");
  await resolveSafeRepositoryPath(root, workingDirectoryAbsolute, { expectedType: "directory" }).catch(error => {
    throw new Error(`Working directory must be inside the repository root: ${error instanceof Error ? error.message : String(error)}`);
  });
  const workingDirectoryRelative = toPosix(path.relative(root, workingDirectoryAbsolute)) || ".";
  const agents = options.agents?.length ? options.agents : supportedAgents;
  const copilotSurface = options.copilotSurface ?? "cloud-agent";
  if (copilotSurface !== "cloud-agent" && copilotSurface !== "code-review") throw new Error(`Unsupported Copilot surface: ${copilotSurface}`);
  let copilotBaseRootAbsolute: string | undefined;
  if (copilotSurface === "code-review") {
    if (!options.copilotBaseRoot) throw new Error("Copilot base root is required for code-review.");
    const configuredBase = path.resolve(options.copilotBaseRoot);
    const baseStat = await fs.stat(configuredBase).catch(() => undefined);
    if (!baseStat?.isDirectory()) throw new Error(`Copilot base root is not a directory: ${options.copilotBaseRoot}`);
    copilotBaseRootAbsolute = await fs.realpath(configuredBase);
  }
  const traces: AgentTrace[] = [];

  for (const agent of agents) {
    const result = await adapters[agent].resolve({ root, targetAbsolute, targetRelative, workingDirectoryAbsolute, workingDirectoryRelative, copilotSurface, copilotBaseRootAbsolute });
    const includedSources = result.sources.filter(source => source.matched && source.loadMode !== "manual");
    const findings = [
      ...findConflicts(includedSources),
      ...findDuplicates(includedSources),
      ...(await findBrokenReferences(root, includedSources)),
      ...findSecurityIssues(includedSources),
      ...findBudgetIssues(includedSources),
      ...(result.blockedPaths ?? []).map((file, index) => ({
        id: `blocked-path-${agent}-${index}`,
        kind: "parser-note" as const,
        severity: "warning" as const,
        title: "Blocked repository escape",
        description: "A symbolic link or path resolves outside the repository and was not read.",
        sources: [{ file: toPosix(path.relative(root, file)) }],
        confidence: "documented" as const
      }))
    ];
    traces.push({
      agent,
      targetFile: targetRelative,
      sources: result.sources,
      includedSources,
      estimatedTokens: includedSources.reduce((sum, source) => sum + estimateTokens(source.normalizedContent), 0),
      totalCharacters: includedSources.reduce((sum, source) => sum + source.normalizedContent.length, 0),
      findings,
      adapterVersion: result.adapterVersion,
      specificationDate: result.specificationDate,
      caveats: result.caveats
    });
  }

  const allSources = traces.flatMap(trace => trace.sources);
  const included = traces.flatMap(trace => trace.includedSources);
  const allFindings = traces.flatMap(trace => trace.findings);
  return {
    schemaVersion: "1.1",
    generatedAt: new Date().toISOString(),
    repositoryRoot: root,
    targetFile: targetRelative,
    workingDirectory: workingDirectoryRelative,
    options: { agents, copilotSurface, ...(copilotBaseRootAbsolute ? { copilotBaseRoot: copilotBaseRootAbsolute } : {}) },
    traces,
    summary: {
      detectedFiles: new Set(allSources.map(source => source.source.file)).size,
      includedFiles: new Set(included.map(source => source.source.file)).size,
      totalFindings: allFindings.length,
      errors: allFindings.filter(f => f.severity === "error").length,
      warnings: allFindings.filter(f => f.severity === "warning").length
    }
  };
}
