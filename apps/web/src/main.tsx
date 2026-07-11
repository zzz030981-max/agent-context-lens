import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AgentId, AgentTrace, RepositoryReport } from "@agent-context-lens/core";
import "./styles.css";

const agentLabels: Record<AgentId, string> = { codex: "Codex", claude: "Claude Code", cursor: "Cursor", copilot: "GitHub Copilot" };

function Metric({ label, value }: {label: string; value: string | number}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Trace({ trace }: { trace: AgentTrace }) {
  const [showAll, setShowAll] = useState(false);
  const sources = showAll ? trace.sources : trace.includedSources;
  return <section className="trace-card">
    <header className="trace-header">
      <div><p className="eyebrow">{trace.adapterVersion}</p><h2>{agentLabels[trace.agent]}</h2></div>
      <div className="trace-metrics"><span>{trace.includedSources.length} sources</span><span>~{trace.estimatedTokens.toLocaleString()} tokens</span></div>
    </header>
    <div className="source-list">
      {sources.length === 0 && <div className="empty">No deterministic instruction sources apply to this file.</div>}
      {sources.map((source, index) => <article className={`source ${source.matched ? "matched" : "unmatched"}`} key={source.id}>
        <div className="source-index">{index + 1}</div>
        <div className="source-body">
          <div className="source-title"><code>{source.source.file}</code><span className={`confidence ${source.confidence}`}>{source.confidence}</span></div>
          <p>{source.matchReason}</p>
          <div className="badges"><span>{source.loadMode}</span><span>priority {source.priority}</span><span>{source.normalizedContent.length} chars</span></div>
          <details><summary>Instruction content</summary><pre>{source.normalizedContent}</pre></details>
        </div>
      </article>)}
    </div>
    {trace.sources.length !== trace.includedSources.length && <button className="text-button" onClick={() => setShowAll(!showAll)}>{showAll ? "Hide non-matching rules" : `Show ${trace.sources.length - trace.includedSources.length} non-matching/manual rules`}</button>}
    <div className="findings">
      <h3>Findings</h3>
      {trace.findings.length === 0 ? <p className="empty small">No deterministic issues detected.</p> : trace.findings.map(finding => <div className={`finding ${finding.severity}`} key={finding.id}>
        <span className="finding-icon">{finding.severity === "error" ? "×" : finding.severity === "warning" ? "!" : "i"}</span>
        <div><strong>{finding.title}</strong><p>{finding.description}</p><small>{finding.confidence} · {finding.sources.map(s => `${s.file}${s.line ? `:${s.line}` : ""}`).join(", ")}</small></div>
      </div>)}
    </div>
    <details className="caveats"><summary>Adapter caveats and evidence limits</summary><ul>{trace.caveats.map(item => <li key={item}>{item}</li>)}</ul></details>
  </section>;
}

function App() {
  const params = new URLSearchParams(location.search);
  const [file, setFile] = useState(params.get("file") ?? "README.md");
  const [draftFile, setDraftFile] = useState(file);
  const [cwd, setCwd] = useState(params.get("cwd") ?? ".");
  const [draftCwd, setDraftCwd] = useState(cwd);
  const [copilotSurface, setCopilotSurface] = useState(params.get("copilotSurface") ?? "cloud-agent");
  const [report, setReport] = useState<RepositoryReport | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgentId | "all">("all");

  useEffect(() => { fetch("/api/files").then(r => r.json()).then(setFiles).catch(() => setFiles([])); }, []);
  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/report?file=${encodeURIComponent(file)}&cwd=${encodeURIComponent(cwd)}&copilotSurface=${encodeURIComponent(copilotSurface)}&agent=all`)
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error ?? "Unable to generate report"); return data; })
      .then(setReport).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [file, cwd, copilotSurface]);

  const traces = useMemo(() => report?.traces.filter(t => selected === "all" || t.agent === selected) ?? [], [report, selected]);
  const applyFile = () => {
    const nextFile = draftFile.trim();
    const nextCwd = draftCwd.trim();
    if (!nextFile || !nextCwd) return;
    setFile(nextFile); setCwd(nextCwd);
    history.replaceState({}, "", `?file=${encodeURIComponent(nextFile)}&cwd=${encodeURIComponent(nextCwd)}&copilotSurface=${encodeURIComponent(copilotSurface)}`);
  };

  return <main>
    <div className="ambient one"/><div className="ambient two"/>
    <nav><div className="brand-mark">CL</div><div><strong>Agent Context Lens</strong><span>Repository instruction debugger</span></div><a href="https://github.com" target="_blank" rel="noreferrer">Open source</a></nav>
    <header className="hero">
      <p className="eyebrow">DevTools for AI coding instructions</p>
      <h1>See the context<br/><em>your agent actually receives.</em></h1>
      <p className="lede">Trace rule inheritance, path matching, conflicts, token cost, broken references, and risky commands across Codex, Claude Code, Cursor, and GitHub Copilot.</p>
      <div className="file-picker">
        <label><span>Target file</span><input list="repo-files" value={draftFile} onChange={e => setDraftFile(e.target.value)} onKeyDown={e => e.key === "Enter" && applyFile()} aria-label="Target file"/></label>
        <label><span>Agent working directory</span><input value={draftCwd} onChange={e => setDraftCwd(e.target.value)} onKeyDown={e => e.key === "Enter" && applyFile()} aria-label="Agent working directory"/></label>
        <label><span>Copilot surface</span><select value={copilotSurface} onChange={e => setCopilotSurface(e.target.value)} aria-label="Copilot surface"><option value="cloud-agent">Cloud agent</option><option value="code-review">Code review</option><option value="ide-chat">IDE chat</option></select></label>
        <datalist id="repo-files">{files.map(item => <option value={item} key={item}/>)}</datalist><button onClick={applyFile}>Inspect file</button>
      </div>
      <p className="selection">Target: <code>{file}</code> · Agent cwd: <code>{cwd}</code> · Copilot: <code>{copilotSurface}</code></p>
      <p className="privacy">Runs locally. No repository content is uploaded.</p>
    </header>

    {report && <section className="overview">
      <Metric label="Detected files" value={report.summary.detectedFiles}/><Metric label="Effective files" value={report.summary.includedFiles}/><Metric label="Warnings" value={report.summary.warnings}/><Metric label="Errors" value={report.summary.errors}/>
    </section>}

    <div className="tabs"><button className={selected === "all" ? "active" : ""} onClick={() => setSelected("all")}>Compare all</button>{(["codex","claude","cursor","copilot"] as AgentId[]).map(agent => <button className={selected === agent ? "active" : ""} onClick={() => setSelected(agent)} key={agent}>{agentLabels[agent]}</button>)}</div>
    {loading && <div className="state">Resolving instruction chains…</div>}
    {error && <div className="state error">{error}</div>}
    <div className="trace-grid">{traces.map(trace => <Trace trace={trace} key={trace.agent}/>)}</div>
    <footer><span>Deterministic analysis, explicit uncertainty.</span><span>Schema v{report?.schemaVersion ?? "1.0"}</span></footer>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
