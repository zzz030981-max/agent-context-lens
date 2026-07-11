import type { Finding, InstructionSource } from "../types.js";
import { stableId } from "../utils.js";
import { extractSentences } from "./sentences.js";

type Category = { name: string; options: Record<string, RegExp[]> };
const categories: Category[] = [
  { name: "package manager", options: {
    npm: [/\buse npm\b/i, /\bnpm install\b/i], pnpm: [/\buse pnpm\b/i, /\bpnpm install\b/i], yarn: [/\buse yarn\b/i, /\byarn install\b/i], bun: [/\buse bun\b/i, /\bbun install\b/i]
  }},
  { name: "indentation", options: {
    two: [/\b2[- ]space/i, /\btwo[- ]space/i], four: [/\b4[- ]space/i, /\bfour[- ]space/i], tabs: [/\buse tabs\b/i]
  }},
  { name: "JavaScript semicolons", options: {
    required: [/\bsemicolons? (?:are )?required\b/i, /\balways use semicolons\b/i], forbidden: [/\bno semicolons\b/i, /\bomit semicolons\b/i, /\bnever use semicolons\b/i]
  }},
  { name: "quote style", options: {
    single: [/\bsingle quotes?\b/i], double: [/\bdouble quotes?\b/i]
  }}
];

export function findConflicts(sources: InstructionSource[]): Finding[] {
  const sentences = extractSentences(sources);
  const findings: Finding[] = [];
  for (const category of categories) {
    const hits = new Map<string, typeof sentences>();
    for (const sentence of sentences) {
      for (const [option, patterns] of Object.entries(category.options)) {
        if (patterns.some(pattern => pattern.test(sentence.text))) {
          const list = hits.get(option) ?? [];
          list.push(sentence);
          hits.set(option, list);
        }
      }
    }
    if (hits.size < 2) continue;
    const entries = [...hits.entries()];
    const sourceRefs = entries.flatMap(([, refs]) => refs.map(ref => ({ file: ref.source.source.file, line: ref.line })));
    findings.push({
      id: stableId("conflict", category.name, JSON.stringify(sourceRefs)),
      kind: "conflict",
      severity: "warning",
      title: `Conflicting ${category.name} instructions`,
      description: entries.map(([option, refs]) => `${option}: ${refs.map(ref => `“${ref.text}”`).join("; ")}`).join(" | "),
      sources: sourceRefs,
      confidence: "inferred"
    });
  }
  return findings;
}
