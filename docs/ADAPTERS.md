# Adapter evidence model

Last reviewed: **2026-07-14**. A `documented` label requires a first-party source. A `verified` label requires a pinned client-version reproduction. Repository-local scans deliberately exclude user and organization policy that is not present in the selected repository.

Agent Context Lens distinguishes four evidence levels:

- **verified** — reproduced against a pinned client version.
- **documented** — supported by current first-party documentation.
- **inferred** — derived from public file formats or observed behavior but not yet pinned to a reproducible client test.
- **unknown** — behavior cannot be determined reliably.

## Codex

Modeled from OpenAI's agent-loop documentation:

- Select one file per directory: `AGENTS.override.md`, then `AGENTS.md`.
- Concatenate repository guidance from the project root through the independent agent working directory (`--cwd`), not through the target-file directory.
- Apply the documented default 32 KiB project-document budget and report original bytes, loaded bytes, and truncation.

Custom fallback filenames, user-level `$CODEX_HOME` instructions, and custom byte-budget configuration remain outside this repository-only scan.

## Claude Code

Modeled from Anthropic's memory documentation:

- `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` from the project root through cwd are startup context.
- Nested instructions below cwd are shown as lazy only when the target reaches their subtree.
- `.claude/rules/**/*.md` can be path-scoped with `paths` frontmatter.
- `@imports` are expanded to four hops, skip fenced-code references, stop cycles, and record missing or repository-external references explicitly.

Managed organization policy and user-level `~/.claude/CLAUDE.md` are excluded.

## Cursor

`.cursor/rules/**/*.mdc`, `alwaysApply`, `globs`, and legacy `.cursorrules` are parsed from Cursor's public rule format. `alwaysApply` and explicit globs are reported as static triggers; agent-requested and manual rules remain non-deterministic.

`npm run cursor:verify` uses a fixed fixture and a pinned Cursor CLI build to verify `alwaysApply` and matching-glob rule markers. The manual `Cursor runtime verification` workflow requires the `CURSOR_API_KEY` repository secret and records its version and evidence in the job summary.

The probe emits `requestedRuleObservation` for its agent-requested fixture rule. Its `status` is `observed` or `not-observed`; `marker`, `scope: "single-run"`, and `effectOnEffectiveContext: "none"` make its limit machine-readable. `fixtureTarget`, `promptSha256`, and `outputSha256` identify the exact probe without retaining model output.

**Cursor semantic selection remains nondeterministic.** An observed or absent marker describes only one pinned CLI execution. Agent-requested rules remain `inferred` or `manual` in reports and are never promoted to deterministic context.

## GitHub Copilot

Modeled from GitHub's custom-instructions documentation:

- `.github/copilot-instructions.md` is repository-wide.
- `.github/instructions/**/*.instructions.md` uses `applyTo` and can exclude `cloud-agent` or `code-review` with `excludeAgent`.
- Only `cloud-agent` and `code-review` are exposed. Generic IDE chat is intentionally excluded because GitHub's support matrix differs by client.
- `code-review` requires an explicit `--copilot-base-root` checkout. Repository and path instructions are read from that PR base checkout while target matching uses the inspected checkout's relative target path.
- Nearest `AGENTS.md` is documented for cloud-agent. Detected `CLAUDE.md` and `GEMINI.md` candidates remain `inferred` when deterministic selection order is undocumented.

Evidence sources: OpenAI agent-loop documentation, Anthropic Claude Code memory documentation, Cursor Rules documentation, and GitHub's repository custom-instructions and support-matrix pages. See `docs/SOURCES.md` for links.
