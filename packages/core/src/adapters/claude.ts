import path from "node:path";
import fs from "node:fs/promises";
import fg from "fast-glob";
import matter from "gray-matter";
import { minimatch } from "minimatch";
import type { AgentAdapter, AdapterContext, AdapterResult, InstructionMetadata } from "../types.js";
import { ancestorDirectories, exists, isWithin, readText, toPosix } from "../utils.js";
import { makeSource } from "./common.js";

interface ImportExpansion {
  content: string;
  metadata: InstructionMetadata;
}

function pathsFromFrontmatter(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map(v => v.trim()).filter(Boolean);
  return [];
}

async function expandImports(root: string, file: string, content: string, depth = 0, visited = new Set<string>(), metadata: InstructionMetadata = {}): Promise<ImportExpansion> {
  const imports = metadata.imports ?? [];
  const brokenReferences = metadata.brokenReferences ?? [];
  const externalImports = metadata.externalImports ?? [];
  if (depth >= 4) return { content, metadata: { ...metadata, imports, brokenReferences, externalImports, depthLimited: true } };
  visited.add(path.resolve(file));
  const withoutFences = content.replace(/```[\s\S]*?```/g, "");
  const refs = [...withoutFences.matchAll(/(^|\s)@([^\s`]+)/gm)].map(match => match[2]).filter(Boolean) as string[];
  let result = content;
  for (const ref of refs) {
    const resolved = ref.startsWith("~/") ? undefined : path.resolve(path.dirname(file), ref);
    if (!resolved || !isWithin(root, resolved)) {
      externalImports.push(ref);
      continue;
    }
    if (visited.has(resolved)) continue;
    if (!(await exists(resolved))) {
      brokenReferences.push(ref);
      continue;
    }
    imports.push(toPosix(path.relative(path.dirname(file), resolved)));
    const imported = await readText(resolved);
    const expanded = await expandImports(root, resolved, imported, depth + 1, visited, { imports, brokenReferences, externalImports });
    result += `\n\n<!-- contextlens import: ${ref} -->\n${expanded.content}`;
    Object.assign(metadata, expanded.metadata);
  }
  return { content: result, metadata: { ...metadata, imports, brokenReferences, externalImports } };
}

export const claudeAdapter: AgentAdapter = {
  id: "claude",
  async resolve(context: AdapterContext): Promise<AdapterResult> {
    const sources = [];
    const targetDirs = ancestorDirectories(context.root, path.dirname(context.targetAbsolute));
    const startupDirs = new Set(ancestorDirectories(context.root, context.workingDirectoryAbsolute));
    let priority = 10;
    for (const dir of targetDirs) {
      const loadMode = startupDirs.has(dir) ? "startup" : isWithin(context.workingDirectoryAbsolute, dir) ? "lazy" : undefined;
      if (!loadMode) continue;
      const candidates = [path.join(dir, "CLAUDE.md"), path.join(dir, ".claude", "CLAUDE.md"), path.join(dir, "CLAUDE.local.md")];
      for (const file of candidates) {
        if (!(await exists(file))) continue;
        const raw = await readText(file);
        const expanded = await expandImports(context.root, file, raw);
        sources.push(makeSource({
          root: context.root,
          agent: "claude",
          file,
          content: expanded.content,
          priority,
          loadMode,
          confidence: "documented",
          matched: true,
          matchReason: loadMode === "startup" ? "Located in the project-root-to-cwd ancestor chain." : "Located below cwd on the target file's directory chain; modeled as lazy context.",
          scopeDescription: `Claude instruction file at ${path.relative(context.root, dir) || "."}.`,
          metadata: expanded.metadata
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
        matchReason: patterns.length === 0 ? "Rule has no paths frontmatter and is modeled as project-wide." : matched ? `Target matches: ${patterns.join(", ")}` : `Target does not match: ${patterns.join(", ")}`,
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
        "Nested Claude instructions below cwd are reported as lazy when the target path reaches their directory.",
        "Imports are expanded up to four hops; missing and external imports are retained as explicit metadata rather than silently ignored.",
        "CLAUDE.md is behavioral context, not an enforcement mechanism."
      ]
    };
  }
};
