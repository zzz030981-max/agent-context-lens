import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { minimatch } from "minimatch";
import type { AgentAdapter, AdapterContext, AdapterResult } from "../types.js";
import { ancestorDirectories, exists, readText } from "../utils.js";
import { makeSource } from "./common.js";

function parseApplyTo(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map(v => v.trim()).filter(Boolean);
  return [];
}

export const copilotAdapter: AgentAdapter = {
  id: "copilot",
  async resolve(context: AdapterContext): Promise<AdapterResult> {
    const sources = [];
    const repoWide = path.join(context.root, ".github", "copilot-instructions.md");
    if (await exists(repoWide)) {
      sources.push(makeSource({
        root: context.root, agent: "copilot", file: repoWide, content: await readText(repoWide), priority: 10,
        loadMode: "startup", confidence: "documented", matched: true,
        matchReason: "Repository-wide Copilot custom instructions file.", scopeDescription: "Repository-wide GitHub Copilot instructions."
      }));
    }

    const pathFiles = await fg(".github/instructions/**/*.instructions.md", { cwd: context.root, absolute: true, dot: true, followSymbolicLinks: false });
    let priority = 20;
    for (const file of pathFiles.sort()) {
      const raw = await readText(file);
      const parsed = matter(raw);
      const patterns = parseApplyTo(parsed.data.applyTo);
      const matched = patterns.some(pattern => minimatch(context.targetRelative, pattern, { dot: true, matchBase: true }));
      sources.push(makeSource({
        root: context.root,
        agent: "copilot",
        file,
        content: parsed.content,
        priority,
        loadMode: "path-match",
        confidence: "documented",
        matched,
        matchReason: matched ? `Target matches applyTo: ${patterns.join(", ")}` : patterns.length ? `Target does not match applyTo: ${patterns.join(", ")}` : "No applyTo pattern found; not automatically included.",
        scopeDescription: patterns.length ? `Copilot path instructions: ${patterns.join(", ")}` : "Copilot path instructions with missing applyTo.",
        metadata: { applyTo: patterns }
      }));
      priority += 1;
    }

    const dirs = ancestorDirectories(context.root, path.dirname(context.targetAbsolute));
    const agentsCandidates: string[] = [];
    for (const dir of dirs) {
      const file = path.join(dir, "AGENTS.md");
      if (await exists(file)) agentsCandidates.push(file);
    }
    const nearest = agentsCandidates.at(-1);
    if (nearest) {
      sources.push(makeSource({
        root: context.root, agent: "copilot", file: nearest, content: await readText(nearest), priority: 90,
        loadMode: "path-match", confidence: "documented", matched: true,
        matchReason: "Nearest AGENTS.md in the target path; GitHub documents nearest-file precedence for agent instructions.",
        scopeDescription: "GitHub Copilot agent instruction file."
      }));
    }

    return {
      sources: sources.sort((a,b) => a.priority - b.priority),
      adapterVersion: "github-copilot-instructions-2026-07",
      specificationDate: "2026-07-11",
      caveats: [
        "Feature support differs between Copilot Chat, cloud agent, code review, IDEs, and GitHub.com.",
        "Path-specific instructions are modeled from applyTo frontmatter; unsupported clients may ignore them.",
        "A root CLAUDE.md or GEMINI.md alternative is not merged here because GitHub's feature-specific selection can differ."
      ]
    };
  }
};
