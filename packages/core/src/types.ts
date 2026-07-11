export type AgentId = "codex" | "claude" | "cursor" | "copilot";
export type CopilotSurface = "cloud-agent" | "code-review" | "ide-chat";
export type Confidence = "verified" | "documented" | "inferred" | "unknown";
export type LoadMode = "startup" | "path-match" | "lazy" | "manual";

export interface SourceLocation {
  file: string;
  line?: number;
}

export interface InstructionSource {
  id: string;
  agent: AgentId;
  source: SourceLocation;
  content: string;
  normalizedContent: string;
  scopeDescription: string;
  priority: number;
  loadMode: LoadMode;
  confidence: Confidence;
  matched: boolean;
  matchReason: string;
  metadata?: InstructionMetadata;
}

export interface InstructionMetadata {
  selectionOrder?: string[];
  originalBytes?: number;
  loadedBytes?: number;
  truncated?: boolean;
  excludedBy?: string[];
  imports?: string[];
  brokenReferences?: string[];
  externalImports?: string[];
  depthLimited?: boolean;
  [key: string]: unknown;
}

export type FindingSeverity = "info" | "warning" | "error";
export type FindingKind = "conflict" | "duplicate" | "broken-reference" | "secret" | "dangerous-command" | "budget" | "parser-note";

export interface Finding {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  title: string;
  description: string;
  sources: SourceLocation[];
  confidence: Confidence;
}

export interface AgentTrace {
  agent: AgentId;
  targetFile: string;
  sources: InstructionSource[];
  includedSources: InstructionSource[];
  estimatedTokens: number;
  totalCharacters: number;
  findings: Finding[];
  adapterVersion: string;
  specificationDate: string;
  caveats: string[];
}

export interface RepositoryReport {
  schemaVersion: "1.1";
  generatedAt: string;
  repositoryRoot: string;
  targetFile: string;
  workingDirectory: string;
  options: {
    agents: AgentId[];
    copilotSurface?: CopilotSurface;
  };
  traces: AgentTrace[];
  summary: {
    detectedFiles: number;
    includedFiles: number;
    totalFindings: number;
    errors: number;
    warnings: number;
  };
}

export interface ResolveOptions {
  repositoryRoot: string;
  targetFile: string;
  workingDirectory?: string;
  agents?: AgentId[];
  copilotSurface?: CopilotSurface;
}

export interface AdapterContext {
  root: string;
  targetAbsolute: string;
  targetRelative: string;
  workingDirectoryAbsolute: string;
  workingDirectoryRelative: string;
  copilotSurface?: CopilotSurface;
}

export interface AdapterResult {
  sources: InstructionSource[];
  adapterVersion: string;
  specificationDate: string;
  caveats: string[];
}

export interface AgentAdapter {
  id: AgentId;
  resolve(context: AdapterContext): Promise<AdapterResult>;
}
