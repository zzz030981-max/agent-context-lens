import path from "node:path";
import fs from "node:fs/promises";
import fg from "fast-glob";
import matter from "gray-matter";
import { minimatch } from "minimatch";
import type { AgentAdapter, AdapterContext, AdapterResult } from "../types.js";
import { ancestorDirectories, exists, readText, toPosix } from "../utils.js";
import { makeSource } from "./common.js";

async function expandImports(file: string, content: string, depth = 0, visited = new Set<string>()): Promise<string> {
  if (depth >= 4 || visited.has(file)) return content;
  visited.add(file);
  const withoutFences = content.replace(/```[\s\S]*?```/g, "");
  const refs = [...withoutFences.matchAll(/(^|\s)@([^\s`]+)/gm)].map(m => m[2]).filter(Boolean) as string[];
  let result = content;
  for (const ref of refs) {
    const resolved = ref.startsWith("~/")
      ? path.join(process.env.HOME ?? "", ref.slice(2))
      : path.resolve(path.dirname(file), ref);
    if (!(await exists(resolved))) continue;
    const imported = await readText(resolved);
    const expanded = await expandImports(resolved, imported, depth + 1, visited);
    result += `\n\n<!-- contextlens import: ${ref} -->\n${expanded}`;
  }
  return result;
}

function pathsFromFrontmatter(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map(v => v.trim()).filter(Boolean);
  return [];
}

export const claudeAdapter: AgentAdapter = {
  id: "claude",
  async resolve(context: AdapterContext): Promise<AdapterResult> {
    const sources = [];
    const dirs = ancestorDirectories(context.root, path.dirname(context.targetAbsolute));
    let priority = 10;
    for (const dir of dirs) {
      const candidates = [path.join(dir, "CLAUDE.md"), path.join(dir, ".claude", "CLAUDE.md"), path.join(dir, "CLAUDE.local.md")];
      for (const file of candidates) {
        if (!(await exists(file))) continue;
        const raw = await readText(file);
        const content = await expandImports(file, raw);
        sources.push(makeSource({
          root: context.root,
          agent: "claude",
          file,
          content,
          priority,
          loadMode: dir === context.root || dirs.includes(dir) ? "startup" : "lazy",
          confidence: "documented",
          matched: true,
          matchReason: "Located in the target file's ancestor chain and loaded in broad-to-specific order.",
          scopeDescription: `Claude instruction file at ${path.relative(context.root, dir) || "."}.`,
          metadata: { importsExpanded: content !== raw }
        }));
        priority += 2;
      }
      priority += 8;
    }

    const ruleFiles = await fg(".claude/rules/**/*.md", { cwd: context.root, absolute: true, dot: true, followSymbolicLinks: false });
    for (const file of ruleFiles.sort()) {
      const raw = await fs.readFile(file, "utf8");
      const parsed = matter(raw);
      const patterns = pathsFromFrontmatter(parsed.data.paths);
      const matched = patterns.length === 0 || patterns.some(pattern => minimatch(context.targetRelative, pattern, { dot: true, matchBase: true }));
      sources.push(makeSource({
        root: context.root,
        agent: "claude",
        file,
        content: parsed.content,
        priority: 80,
        loadMode: patterns.length === 0 ? "startup" : "path-match",
        confidence: "documented",
        matched,
        matchReason: patterns.length === 0 ? "Rule has no paths frontmatter and loads every session." : matched ? `Target matches: ${patterns.join(", ")}` : `Target does not match: ${patterns.join(", ")}`,
        scopeDescription: patterns.length === 0 ? "Project-wide Claude rule." : `Path-scoped Claude rule: ${patterns.join(", ")}`,
        metadata: { paths: patterns }
      }));
    }

    return {
      sources: sources.sort((a, b) => a.priority - b.priority || a.source.file.localeCompare(b.source.file)),
      adapterVersion: "claude-memory-2026-07",
      specificationDate: "2026-07-11",
      caveats: [
        "Managed organization instructions and user-level ~/.claude/CLAUDE.md are excluded because the scan is repository-local.",
        "Subdirectory CLAUDE.md files are modeled as relevant when the target file is read; real sessions load them lazily.",
        "Imports are expanded up to four hops; external imports are included only when readable on the local machine.",
        "CLAUDE.md is behavioral context, not an enforcement mechanism."
      ]
    };
  }
};
