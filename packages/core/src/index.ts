import path from "node:path";
import fs from "node:fs/promises";
import type { AgentAdapter, AgentId, AgentTrace, RepositoryReport, ResolveOptions } from "./types.js";
import { codexAdapter } from "./adapters/codex.js";
import { claudeAdapter } from "./adapters/claude.js";
import { cursorAdapter } from "./adapters/cursor.js";
import { copilotAdapter } from "./adapters/copilot.js";
import { estimateTokens, toPosix } from "./utils.js";
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
  const root = path.resolve(options.repositoryRoot);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new Error(`Repository root is not a directory: ${root}`);
  const targetAbsolute = path.resolve(root, options.targetFile);
  const targetFromRoot = path.relative(root, targetAbsolute);
  if (targetFromRoot.startsWith("..") || path.isAbsolute(targetFromRoot)) throw new Error("Target file must be inside the repository root.");
  const targetRelative = toPosix(path.relative(root, targetAbsolute));
  const agents = options.agents?.length ? options.agents : supportedAgents;
  const traces: AgentTrace[] = [];

  for (const agent of agents) {
    const result = await adapters[agent].resolve({ root, targetAbsolute, targetRelative });
    const includedSources = result.sources.filter(source => source.matched && source.loadMode !== "manual");
    const findings = [
      ...findConflicts(includedSources),
      ...findDuplicates(includedSources),
      ...(await findBrokenReferences(root, includedSources)),
      ...findSecurityIssues(includedSources),
      ...findBudgetIssues(includedSources)
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
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    repositoryRoot: root,
    targetFile: targetRelative,
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
