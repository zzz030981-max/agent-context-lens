import path from "node:path";
import type { AgentAdapter, AdapterContext, AdapterResult } from "../types.js";
import { ancestorDirectories, exists, readText } from "../utils.js";
import { makeSource } from "./common.js";

export const codexAdapter: AgentAdapter = {
  id: "codex",
  async resolve(context: AdapterContext): Promise<AdapterResult> {
    const dirs = ancestorDirectories(context.root, path.dirname(context.targetAbsolute));
    const sources = [];
    let priority = 10;
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
      sources.push(makeSource({
        root: context.root,
        agent: "codex",
        file: selected,
        content,
        priority,
        loadMode: "startup",
        confidence: "documented",
        matched: true,
        matchReason: "Selected as the first non-empty Codex instruction file in this directory.",
        scopeDescription: `Applies from ${path.relative(context.root, dir) || "."} to descendants. Later directories have higher precedence.`,
        metadata: { selectionOrder: candidates }
      }));
      priority += 10;
    }
    return {
      sources,
      adapterVersion: "codex-agents-md-2026-07",
      specificationDate: "2026-07-11",
      caveats: [
        "This resolver models repository-scoped discovery only; user-level ~/.codex instructions are intentionally excluded.",
        "Custom project_doc_fallback_filenames and project_doc_max_bytes values are not read unless a future config adapter is enabled.",
        "Codex concatenates root-to-working-directory guidance; textual contradictions are still resolved by the model, not enforced by this tool."
      ]
    };
  }
};
