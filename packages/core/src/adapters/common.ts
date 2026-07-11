import path from "node:path";
import type { AgentId, Confidence, InstructionSource, LoadMode } from "../types.js";
import { normalizeInstruction, relativeTo, stableId } from "../utils.js";

export function makeSource(input: {
  root: string;
  agent: AgentId;
  file: string;
  content: string;
  priority: number;
  loadMode: LoadMode;
  confidence: Confidence;
  matched: boolean;
  matchReason: string;
  scopeDescription: string;
  metadata?: Record<string, unknown>;
}): InstructionSource {
  const rel = relativeTo(input.root, path.resolve(input.file));
  return {
    id: stableId(input.agent, rel, String(input.priority), input.matchReason),
    agent: input.agent,
    source: { file: rel },
    content: input.content,
    normalizedContent: normalizeInstruction(input.content),
    scopeDescription: input.scopeDescription,
    priority: input.priority,
    loadMode: input.loadMode,
    confidence: input.confidence,
    matched: input.matched,
    matchReason: input.matchReason,
    metadata: input.metadata
  };
}
