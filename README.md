<div align="center">

# Agent Context Lens

**Why does Cursor follow pnpm while Copilot recommends npm?**

See exactly which repository instructions each AI coding agent receives for a specific file—and where those instructions conflict.

`100% local` · `No API key` · `Read-only` · `Deterministic by default`

[![npm](https://img.shields.io/npm/v/agent-context-lens?logo=npm)](https://www.npmjs.com/package/agent-context-lens)
[![CI](https://github.com/zzz030981-max/agent-context-lens/actions/workflows/ci.yml/badge.svg)](https://github.com/zzz030981-max/agent-context-lens/actions/workflows/ci.yml)
[![Node](https://img.shields.io/node/v/agent-context-lens)](https://www.npmjs.com/package/agent-context-lens)
[![License](https://img.shields.io/github/license/zzz030981-max/agent-context-lens)](LICENSE)
[![Release](https://img.shields.io/github/v/release/zzz030981-max/agent-context-lens)](https://github.com/zzz030981-max/agent-context-lens/releases)

</div>

---

## See it in 15 seconds

```bash
npx -y agent-context-lens@latest inspect . --file src/index.ts --cwd . --agent all
```

```text
Agent Context Lens — src/auth/login.ts

CURSOR   2 included
  ✓ .cursor/rules/auth.mdc [path-match; inferred]
  ✓ .cursor/rules/base.mdc [startup; inferred]
  ⚠ Conflicting package manager instructions

COPILOT  3 included
  ✓ .github/copilot-instructions.md [startup; documented]
  ✓ .github/instructions/typescript.instructions.md [path-match; documented]
  ✓ src/AGENTS.md [path-match; documented]
  ⚠ Conflicting package manager instructions
```

This output is generated from the repository's included `fixtures/conflicting-rules` demo. It traces inheritance, path matching, conflicts, token cost, broken references, credential-like values, and risky commands across **Codex, Claude Code, Cursor, and GitHub Copilot**.

## Why this exists

A modern repository may contain `AGENTS.md`, `CLAUDE.md`, `.claude/rules`, `.cursor/rules`, `.github/copilot-instructions.md`, and path-specific Copilot instructions. The hard question is not whether those files exist. It is:

> For this exact file and this exact agent, what context is actually in scope, in what order, and where does it conflict?

Agent Context Lens is the equivalent of a CSS cascade inspector for AI coding instructions.

## Install

```bash
npm install --global agent-context-lens
```

## How it differs

| Tool | Main job |
|---|---|
| Agent Context Lens | Explains which instructions actually apply to a specific file and agent. |
| Agnix | Validates AI configuration files and best-practice issues. |
| Rulesync | Generates or synchronizes rules across AI tools. |

**Agnix validates the files. Rulesync generates the files. Agent Context Lens explains which files actually apply.**

## Development

```bash
npm install
npm run build
node apps/cli/dist/index.js serve . --file src/index.ts --cwd .
```

Open the printed local URL. Nothing is uploaded.

CLI-only trace:

```bash
node apps/cli/dist/index.js inspect . --file src/index.ts --cwd . --agent all
```

JSON for automation:

```bash
node apps/cli/dist/index.js inspect . \
  --file src/index.ts \
  --cwd . \
  --copilot-surface cloud-agent \
  --agent codex,claude \
  --json \
  --output .contextlens/report.json
```

Copilot code review must be given a separately prepared PR base checkout. The scan never checks out or reads Git history itself:

```bash
contextlens inspect ./feature-worktree \
  --file src/index.ts \
  --cwd . \
  --agent copilot \
  --copilot-surface code-review \
  --copilot-base-root ../main-worktree
```

## What the report explains

- Which instruction files were detected
- Which files deterministically apply to the target file
- Load mode: startup, path match, lazy, or manual
- Ordering and effective priority
- Evidence level: verified, documented, inferred, or unknown
- Approximate instruction-token cost
- Contradictory package manager, indentation, semicolon, and quote rules
- Exact duplicates across files
- Missing path/import references
- Credential-like strings
- High-risk commands such as remote scripts piped to a shell

## Supported sources

| Agent | Sources | Evidence status |
|---|---|---|
| Codex | `AGENTS.override.md`, `AGENTS.md` | Documented |
| Claude Code | `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/**/*.md`, `@imports` | Documented |
| Cursor | `.cursor/rules/**/*.mdc`, `.cursorrules` | Inferred; pinned runtime probe verifies always/glob markers |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md`, nearest `AGENTS.md` | Documented, surface-dependent |

See [Adapter evidence and caveats](docs/ADAPTERS.md).

## Accuracy principles

Agent behavior changes. This project does not hide that uncertainty.

1. Every source carries a confidence label.
2. Repository-local analysis excludes unobservable user and organization policy unless explicitly provided.
3. Nondeterministic semantic rule selection is shown as manual, not falsely included.
4. Analyzers report evidence and source locations; they do not claim model enforcement.
5. Adapter changes require first-party documentation or reproducible version-pinned evidence.

## Project structure

```text
apps/web       local comparison UI
apps/cli       inspect and serve commands
packages/core  adapters, resolver, analyzers, report schema
fixtures       reproducible test repositories
```

Run the intentional-conflict demo:

```bash
node apps/cli/dist/index.js serve fixtures/conflicting-rules \
  --file src/auth/login.ts \
  --cwd . \
  --no-open
```

## Security and privacy

- Read-only repository scan
- No shell execution
- No LLM or external API calls
- No telemetry
- Local loopback server
- Reports may still contain sensitive instruction text; handle exported JSON accordingly

See [SECURITY.md](SECURITY.md).

## Known limitations

- Token counts are estimates, not provider billing counts.
- Natural-language conflict detection is intentionally conservative.
- User-level and organization-managed instructions are excluded unless they are part of the scanned repository.
- Cursor agent-selected rules are nondeterministic and therefore displayed separately.
- Copilot feature support differs between IDE, chat, code review, and cloud-agent surfaces.
- Code-review reports require a caller-provided PR base checkout; generic IDE chat is not modeled.

## Contributing

Accuracy reports are especially valuable. Provide official documentation or a reproducible pinned-version trace. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
