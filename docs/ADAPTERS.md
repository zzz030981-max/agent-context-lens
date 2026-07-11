# Adapter evidence model

Agent Context Lens distinguishes four evidence levels:

- **verified** — reproduced against a pinned client version.
- **documented** — supported by current first-party documentation.
- **inferred** — derived from public file formats or observed behavior but not yet pinned to a reproducible client test.
- **unknown** — behavior cannot be determined reliably.

## Codex

Modeled behavior:

- One instruction file per directory.
- Selection order: `AGENTS.override.md`, then `AGENTS.md`.
- Root-to-working-directory concatenation.
- Later, more specific instructions have higher effective precedence.

Repository-local scans intentionally exclude `~/.codex` and custom fallback names.

## Claude Code

Modeled behavior:

- `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` in the ancestor chain.
- Root-to-working-directory concatenation.
- Subdirectory instructions are treated as lazy sources for files under that subtree.
- `.claude/rules/**/*.md` and `paths` frontmatter.
- `@path` imports up to four hops.

Managed and user-level policy files are excluded.

## Cursor

Modeled behavior:

- `.cursor/rules/**/*.mdc`.
- `alwaysApply` and `globs` frontmatter.
- Legacy `.cursorrules`.

Rules selected semantically by an agent are nondeterministic and displayed as manual rather than included. This adapter remains `inferred` until pinned runtime verification is added.

## GitHub Copilot

Modeled behavior:

- `.github/copilot-instructions.md` repository-wide instructions.
- `.github/instructions/**/*.instructions.md` with `applyTo` frontmatter.
- Nearest `AGENTS.md` for agent instructions.

Support differs by Copilot surface; the report displays this caveat.
