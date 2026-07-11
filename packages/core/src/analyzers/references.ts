import path from "node:path";
import type { Finding, InstructionSource } from "../types.js";
import { exists, stableId } from "../utils.js";

const pathPattern = /(?:^|[\s("'`])((?:\.\.\/|\.\/)?(?:[A-Za-z0-9_.-]+\/)+(?:[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)?)(?=$|[\s)"'`,:])/gm;
const importPattern = /(^|\s)@([^\s`]+)/gm;

export async function findBrokenReferences(root: string, sources: InstructionSource[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const source of sources) {
    const base = path.dirname(path.join(root, source.source.file));
    const refs = new Set<string>();
    for (const match of source.content.matchAll(pathPattern)) if (match[1]) refs.add(match[1]);
    for (const match of source.content.matchAll(importPattern)) if (match[2]) refs.add(match[2]);
    for (const ref of refs) {
      if (/^(https?:|file:)/i.test(ref) || ref.includes("*")) continue;
      const candidate = ref.startsWith("~/") ? path.join(process.env.HOME ?? "", ref.slice(2)) : path.resolve(base, ref);
      if (await exists(candidate)) continue;
      findings.push({
        id: stableId("broken-reference", source.source.file, ref),
        kind: "broken-reference",
        severity: ref.startsWith("@") ? "warning" : "info",
        title: "Referenced path does not exist",
        description: `“${ref}” resolves to a missing path from ${source.source.file}.`,
        sources: [source.source],
        confidence: "inferred"
      });
    }
  }
  return findings;
}
