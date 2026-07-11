import type { InstructionSource } from "../types.js";

export interface SentenceRef {
  text: string;
  normalized: string;
  source: InstructionSource;
  line: number;
}

export function extractSentences(sources: InstructionSource[]): SentenceRef[] {
  const result: SentenceRef[] = [];
  for (const source of sources) {
    const lines = source.normalizedContent.split("\n");
    lines.forEach((line, index) => {
      const cleaned = line.replace(/^\s*(?:[-*+] |\d+[.)] |#+\s*)/, "").trim();
      if (cleaned.length < 6 || cleaned.startsWith("```")) return;
      result.push({
        text: cleaned,
        normalized: cleaned.toLowerCase().replace(/[`*_]/g, "").replace(/\s+/g, " ").trim(),
        source,
        line: index + 1
      });
    });
  }
  return result;
}
