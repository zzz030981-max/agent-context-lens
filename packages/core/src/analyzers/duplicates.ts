import type { Finding, InstructionSource } from "../types.js";
import { stableId } from "../utils.js";
import { extractSentences } from "./sentences.js";

export function findDuplicates(sources: InstructionSource[]): Finding[] {
  const byText = new Map<string, ReturnType<typeof extractSentences>>();
  for (const sentence of extractSentences(sources)) {
    if (sentence.normalized.length < 20) continue;
    const list = byText.get(sentence.normalized) ?? [];
    list.push(sentence);
    byText.set(sentence.normalized, list);
  }
  return [...byText.entries()].filter(([, refs]) => new Set(refs.map(r => r.source.source.file)).size > 1).map(([text, refs]) => ({
    id: stableId("duplicate", text),
    kind: "duplicate" as const,
    severity: "info" as const,
    title: "Duplicate instruction",
    description: `The same instruction appears in ${new Set(refs.map(r => r.source.source.file)).size} files: “${refs[0]?.text ?? text}”`,
    sources: refs.map(ref => ({ file: ref.source.source.file, line: ref.line })),
    confidence: "verified" as const
  }));
}
