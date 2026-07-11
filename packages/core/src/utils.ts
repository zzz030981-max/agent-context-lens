import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

export const toPosix = (value: string): string => value.split(path.sep).join("/");

export async function exists(file: string): Promise<boolean> {
  try { await fs.access(file); return true; } catch { return false; }
}

export async function readText(file: string): Promise<string> {
  return fs.readFile(file, "utf8");
}

export function relativeTo(root: string, file: string): string {
  const rel = toPosix(path.relative(root, file));
  return rel || ".";
}

export function normalizeInstruction(content: string): string {
  return content
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

export function stableId(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 16);
}

export function estimateTokens(content: string): number {
  const latinWords = content.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const cjkChars = content.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const punctuation = content.match(/[^\sA-Za-z0-9_\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  return Math.max(1, Math.ceil(latinWords * 1.3 + cjkChars * 1.1 + punctuation * 0.35));
}

export function ancestorDirectories(root: string, targetDir: string): string[] {
  const normalizedRoot = path.resolve(root);
  let current = path.resolve(targetDir);
  const dirs: string[] = [];
  while (current.startsWith(normalizedRoot)) {
    dirs.push(current);
    if (current === normalizedRoot) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs.reverse();
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  return end === -1 ? content : content.slice(end + 4).replace(/^\r?\n/, "");
}
