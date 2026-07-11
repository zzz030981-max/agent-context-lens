import path from "node:path";
import type { AgentAdapter, AdapterContext, AdapterResult } from "../types.js";
import { ancestorDirectories, exists, readText } from "../utils.js";
import { makeSource } from "./common.js";

export const codexAdapter: AgentAdapter = {
  id: "codex",
  async resolve(context: AdapterContext): Promise<AdapterResult> {
    const dirs = ancestorDirectories(context.root, context.workingDirectoryAbsolute);
    const sources = [];
    let priority = 10;
    let remainingBytes = 32 * 1024;
    for (const dir of dirs) {
      const candidates = ["AGENTS.override.md", "AGENTS.md"];
      let selected: string | undefined;
      for (const name of candidates) {
        const file = path.join(dir, name);
        if (await exists(file)) { selected = file; break; }
      }
      if (!selected) continue;
      const content = await readText(selected);
      if (!content.trim()) continue;
      const originalBytes = Buffer.byteLength(content);
      const loadedContent = truncateUtf8(content, remainingBytes);
      const loadedBytes = Buffer.byteLength(loadedContent);
      const truncated = loadedBytes < originalBytes;
      sources.push(makeSource({
        root: context.root,
        agent: "codex",
        file: selected,
        content: loadedContent,
        priority,
        loadMode: "startup",
        confidence: "documented",
        matched: true,
        matchReason: "Selected as the first non-empty Codex instruction file in this directory.",
        scopeDescription: `Applies from ${path.relative(context.root, dir) || "."} to descendants. Later directories have higher precedence.`,
        metadata: { selectionOrder: candidates, originalBytes, loadedBytes, truncated }
      }));
      remainingBytes -= loadedBytes;
      if (remainingBytes <= 0) break;
      priority += 10;
    }
    return {
      sources,
      adapterVersion: "codex-agents-md-2026-07",
      specificationDate: "2026-07-11",
      caveats: [
        "This resolver models repository-scoped discovery only; user-level ~/.codex instructions are intentionally excluded.",
        "Custom project_doc_fallback_filenames and project_doc_max_bytes values are not read; this resolver uses Codex's documented default 32 KiB project-doc budget.",
        "Codex concatenates root-to-working-directory guidance; textual contradictions are still resolved by the model, not enforced by this tool."
      ]
    };
  }
};

function truncateUtf8(content: string, limit: number): string {
  if (Buffer.byteLength(content) <= limit) return content;
  let end = content.length;
  let start = 0;
  while (start < end) {
    const middle = Math.ceil((start + end) / 2);
    if (Buffer.byteLength(content.slice(0, middle)) <= limit) start = middle;
    else end = middle - 1;
  }
  return content.slice(0, start);
}
