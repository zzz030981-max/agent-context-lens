import type { Finding, InstructionSource } from "../types.js";
import { estimateTokens, stableId } from "../utils.js";

export function findBudgetIssues(sources: InstructionSource[]): Finding[] {
  const total = sources.reduce((sum, source) => sum + estimateTokens(source.normalizedContent), 0);
  if (total < 4000) return [];
  return [{
    id: stableId("budget", String(total)),
    kind: "budget",
    severity: total >= 8000 ? "warning" : "info",
    title: "Large instruction context",
    description: `The deterministic instruction set is estimated at ${total.toLocaleString()} tokens. Large context can reduce adherence and consume model context.`,
    sources: sources.map(source => source.source),
    confidence: "inferred"
  }];
}
