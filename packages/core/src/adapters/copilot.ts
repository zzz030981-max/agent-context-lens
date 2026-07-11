import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { minimatch } from "minimatch";
import type { AgentAdapter, AdapterContext, AdapterResult, CopilotSurface } from "../types.js";
import { ancestorDirectories, exists, readText } from "../utils.js";
import { makeSource } from "./common.js";

function listValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map(item => item.trim()).filter(Boolean);
  return [];
}

function isExcluded(excludedBy: string[], surface: CopilotSurface): boolean {
  return excludedBy.includes(surface);
}

export const copilotAdapter: AgentAdapter = {
  id: "copilot",
  async resolve(context: AdapterContext): Promise<AdapterResult> {
    const surface = context.copilotSurface ?? "cloud-agent";
    const sources = [];
    const repoWide = path.join(context.root, ".github", "copilot-instructions.md");
    if (await exists(repoWide)) {
      sources.push(makeSource({
        root: context.root, agent: "copilot", file: repoWide, content: await readText(repoWide), priority: 10,
        loadMode: "startup", confidence: "documented", matched: true,
        matchReason: `Repository-wide Copilot custom instructions for ${surface}.`, scopeDescription: "Repository-wide GitHub Copilot instructions.", metadata: { surface }
      }));
    }

    const pathFiles = await fg(".github/instructions/**/*.instructions.md", { cwd: context.root, absolute: true, dot: true, followSymbolicLinks: false });
    let priority = 20;
    for (const file of pathFiles.sort()) {
      const parsed = matter(await readText(file));
      const patterns = listValue(parsed.data.applyTo);
      const excludedBy = listValue(parsed.data.excludeAgent);
      const excluded = isExcluded(excludedBy, surface);
      const pathMatched = patterns.some(pattern => minimatch(context.targetRelative, pattern, { dot: true, matchBase: true }));
      const matched = patterns.length > 0 && pathMatched && !excluded;
      sources.push(makeSource({
        root: context.root,
        agent: "copilot",
        file,
        content: parsed.content,
        priority,
        loadMode: "path-match",
        confidence: "documented",
        matched,
        matchReason: excluded ? `Excluded for Copilot ${surface}.` : matched ? `Target matches applyTo: ${patterns.join(", ")}` : patterns.length ? `Target does not match applyTo: ${patterns.join(", ")}` : "No applyTo pattern found; not automatically included.",
        scopeDescription: patterns.length ? `Copilot path instructions: ${patterns.join(", ")}` : "Copilot path instructions with missing applyTo.",
        metadata: { applyTo: patterns, excludedBy, surface }
      }));
      priority += 1;
    }

    const dirs = ancestorDirectories(context.root, path.dirname(context.targetAbsolute));
    const nearestAgents = [] as string[];
    for (const dir of dirs) {
      const file = path.join(dir, "AGENTS.md");
      if (await exists(file)) nearestAgents.push(file);
    }
    const nearest = nearestAgents.at(-1);
    if (nearest) {
      const cloud = surface === "cloud-agent";
      sources.push(makeSource({
        root: context.root, agent: "copilot", file: nearest, content: await readText(nearest), priority: 90,
        loadMode: cloud ? "path-match" : "manual", confidence: cloud ? "documented" : "inferred", matched: cloud,
        matchReason: cloud ? "Nearest AGENTS.md for the target path; documented for Copilot cloud agent." : `AGENTS.md support is not modeled as deterministic for ${surface}.`,
        scopeDescription: "GitHub Copilot agent instruction file.", metadata: { surface }
      }));
    }

    if (surface === "cloud-agent") {
      for (const name of ["CLAUDE.md", "GEMINI.md"]) {
        const file = path.join(context.root, name);
        if (!(await exists(file))) continue;
        sources.push(makeSource({
          root: context.root, agent: "copilot", file, content: await readText(file), priority: 91,
          loadMode: "manual", confidence: "inferred", matched: false,
          matchReason: `${name} is detected, but repository-static selection is not modeled as deterministic.`,
          scopeDescription: "Surface-dependent Copilot agent instruction candidate.", metadata: { surface }
        }));
      }
    }

    return {
      sources: sources.sort((a, b) => a.priority - b.priority),
      adapterVersion: "github-copilot-instructions-2026-07",
      specificationDate: "2026-07-11",
      caveats: [
        "cloud-agent and code-review are modeled from current GitHub documentation; IDE chat support is reported conservatively where surface behavior differs.",
        "Path-specific instructions require applyTo and may be excluded with excludeAgent.",
        "CLAUDE.md and GEMINI.md candidates are detected for cloud-agent but remain inferred unless GitHub documents deterministic selection order."
      ]
    };
  }
};
