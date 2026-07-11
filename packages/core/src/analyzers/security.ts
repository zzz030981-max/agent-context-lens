import type { Finding, InstructionSource } from "../types.js";
import { stableId } from "../utils.js";

const secretPatterns = [
  { label: "OpenAI-style API key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { label: "GitHub personal access token", regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { label: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: "Private key block", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g }
];

const dangerousPatterns = [
  { label: "recursive deletion of a root-like path", regex: /\brm\s+-rf\s+(?:\/|~|\.\.)\b/g },
  { label: "remote script piped to a shell", regex: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:bash|sh|zsh)\b/g },
  { label: "world-writable permission", regex: /\bchmod\s+(?:-R\s+)?777\b/g },
  { label: "destructive Git reset", regex: /\bgit\s+reset\s+--hard\b/g }
];

export function findSecurityIssues(sources: InstructionSource[]): Finding[] {
  const findings: Finding[] = [];
  for (const source of sources) {
    for (const pattern of secretPatterns) {
      if (!pattern.regex.test(source.content)) continue;
      pattern.regex.lastIndex = 0;
      findings.push({
        id: stableId("secret", source.source.file, pattern.label),
        kind: "secret",
        severity: "error",
        title: `Possible ${pattern.label}`,
        description: "A credential-like value appears in an instruction file. Confirm it is a placeholder or rotate and remove it.",
        sources: [source.source],
        confidence: "inferred"
      });
    }
    for (const pattern of dangerousPatterns) {
      if (!pattern.regex.test(source.content)) continue;
      pattern.regex.lastIndex = 0;
      findings.push({
        id: stableId("danger", source.source.file, pattern.label),
        kind: "dangerous-command",
        severity: "warning",
        title: `Potentially dangerous command: ${pattern.label}`,
        description: "Instruction files can influence autonomous tools. Review this command and require explicit confirmation before execution.",
        sources: [source.source],
        confidence: "verified"
      });
    }
  }
  return findings;
}
