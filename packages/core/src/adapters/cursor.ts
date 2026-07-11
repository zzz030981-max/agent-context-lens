import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { minimatch } from "minimatch";
import type { AgentAdapter, AdapterContext, AdapterResult } from "../types.js";
import { exists, readText } from "../utils.js";
import { makeSource } from "./common.js";

function parseGlobs(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map(v => v.trim()).filter(Boolean);
  return [];
}

export const cursorAdapter: AgentAdapter = {
  id: "cursor",
  async resolve(context: AdapterContext): Promise<AdapterResult> {
    const sources = [];
    const legacy = path.join(context.root, ".cursorrules");
    if (await exists(legacy)) {
      sources.push(makeSource({
        root: context.root, agent: "cursor", file: legacy, content: await readText(legacy), priority: 5,
        loadMode: "startup", confidence: "documented", matched: true,
        matchReason: "Legacy project-wide Cursor rules file detected.",
        scopeDescription: "Legacy project-wide Cursor rules."
      }));
    }

    const files = await fg(".cursor/rules/**/*.mdc", { cwd: context.root, absolute: true, dot: true, followSymbolicLinks: false });
    let priority = 20;
    for (const file of files.sort()) {
      const raw = await readText(file);
      const parsed = matter(raw);
      const globs = parseGlobs(parsed.data.globs);
      const alwaysApply = parsed.data.alwaysApply === true || String(parsed.data.alwaysApply).toLowerCase() === "true";
      const matchedByGlob = globs.some(pattern => minimatch(context.targetRelative, pattern, { dot: true, matchBase: true }));
      const matched = alwaysApply || matchedByGlob;
      const loadMode = alwaysApply ? "startup" : globs.length ? "path-match" : "manual";
      sources.push(makeSource({
        root: context.root,
        agent: "cursor",
        file,
        content: parsed.content,
        priority,
        loadMode,
        confidence: "inferred",
        matched,
        matchReason: alwaysApply ? "alwaysApply is true." : matchedByGlob ? `Target matches: ${globs.join(", ")}` : globs.length ? `Target does not match: ${globs.join(", ")}` : "No automatic trigger declared; treated as manual/agent-selected.",
        scopeDescription: alwaysApply ? "Always-applied Cursor project rule." : globs.length ? `Cursor glob rule: ${globs.join(", ")}` : "Cursor rule without an automatic trigger.",
        metadata: { description: parsed.data.description, globs, alwaysApply }
      }));
      priority += 1;
    }

    return {
      sources,
      adapterVersion: "cursor-mdc-2026-07",
      specificationDate: "2026-07-11",
      caveats: [
        "Cursor's documentation site is dynamically rendered; frontmatter behavior here follows the public .mdc format and is marked inferred until verified against a pinned Cursor build.",
        "Rules without alwaysApply or globs may be selected by the agent based on description; this nondeterministic selection is shown as manual and excluded from the deterministic effective context.",
        "User-level Cursor rules are excluded."
      ]
    };
  }
};
