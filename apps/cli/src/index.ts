#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import open from "open";
import pc from "picocolors";
import { Command } from "commander";
import { resolveRepository, supportedAgents, type AgentId, type RepositoryReport } from "@agent-context-lens/core";

const program = new Command();
program.name("contextlens").description("Explain which repository instructions AI coding agents receive.").version("0.1.0");

function parseAgents(value: string): AgentId[] {
  if (value === "all") return supportedAgents;
  const agents = value.split(",").map(v => v.trim()) as AgentId[];
  const invalid = agents.filter(agent => !supportedAgents.includes(agent));
  if (invalid.length) throw new Error(`Unsupported agent(s): ${invalid.join(", ")}`);
  return agents;
}

function printReport(report: RepositoryReport): void {
  console.log(pc.bold(`\nAgent Context Lens — ${report.targetFile}`));
  console.log(pc.dim(report.repositoryRoot));
  for (const trace of report.traces) {
    console.log(`\n${pc.cyan(pc.bold(trace.agent.toUpperCase()))}  ${trace.includedSources.length} included  ~${trace.estimatedTokens} tokens`);
    if (!trace.includedSources.length) console.log(pc.dim("  No deterministic instruction sources found."));
    for (const source of trace.includedSources) {
      console.log(`  ${pc.green("✓")} ${source.source.file} ${pc.dim(`[${source.loadMode}; ${source.confidence}]`)}`);
      console.log(`    ${pc.dim(source.matchReason)}`);
    }
    for (const finding of trace.findings) {
      const marker = finding.severity === "error" ? pc.red("✖") : finding.severity === "warning" ? pc.yellow("⚠") : pc.blue("i");
      console.log(`  ${marker} ${finding.title}`);
    }
  }
  console.log(`\n${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.totalFindings} total findings\n`);
}

async function generateReport(root: string, file: string, agents: AgentId[]): Promise<RepositoryReport> {
  return resolveRepository({ repositoryRoot: root, targetFile: file, agents });
}

program.command("inspect")
  .argument("[root]", "repository root", ".")
  .option("-f, --file <path>", "target file relative to repository root", "README.md")
  .option("-a, --agent <agents>", "codex,claude,cursor,copilot, or all", "all")
  .option("--json", "print JSON")
  .option("--output <path>", "write JSON report to a file")
  .action(async (root, options) => {
    try {
      const report = await generateReport(root, options.file, parseAgents(options.agent));
      if (options.output) {
        const out = path.resolve(options.output);
        await fs.mkdir(path.dirname(out), { recursive: true });
        await fs.writeFile(out, JSON.stringify(report, null, 2));
        console.error(`Wrote ${out}`);
      }
      if (options.json) console.log(JSON.stringify(report, null, 2)); else printReport(report);
      if (report.summary.errors > 0) process.exitCode = 2;
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

program.command("serve")
  .argument("[root]", "repository root", ".")
  .option("-f, --file <path>", "initial target file", "README.md")
  .option("-p, --port <port>", "port", "4173")
  .option("--no-open", "do not open the browser")
  .action(async (root, options) => {
    const repositoryRoot = path.resolve(root);
    const app = express();
    app.disable("x-powered-by");
    app.get("/api/report", async (req, res) => {
      try {
        const targetFile = typeof req.query.file === "string" ? req.query.file : options.file;
        const agents = typeof req.query.agent === "string" ? parseAgents(req.query.agent) : supportedAgents;
        res.json(await generateReport(repositoryRoot, targetFile, agents));
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });
    app.get("/api/files", async (_req, res) => {
      const files: string[] = [];
      const ignore = new Set([".git", "node_modules", "dist", ".contextlens"]);
      async function walk(dir: string): Promise<void> {
        for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
          if (ignore.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) await walk(full);
          else files.push(full.slice(repositoryRoot.length + 1).split(path.sep).join("/"));
          if (files.length >= 5000) return;
        }
      }
      await walk(repositoryRoot);
      res.json(files.sort());
    });
    const currentFile = fileURLToPath(import.meta.url);
    const packagedWeb = path.resolve(path.dirname(currentFile), "web");
    const monorepoWeb = path.resolve(path.dirname(currentFile), "../../web/dist");
    const webDist = existsSync(packagedWeb) ? packagedWeb : monorepoWeb;
    app.use(express.static(webDist));
    app.get("/{*splat}", (_req, res) => res.sendFile(path.join(webDist, "index.html")));
    const port = Number(options.port);
    app.listen(port, "127.0.0.1", async () => {
      const url = `http://127.0.0.1:${port}?file=${encodeURIComponent(options.file)}`;
      console.log(`Agent Context Lens: ${url}`);
      if (options.open) await open(url);
    });
  });

await program.parseAsync();
