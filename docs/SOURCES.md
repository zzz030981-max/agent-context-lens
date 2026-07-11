# First-party specification sources

Last reviewed: **2026-07-11**.

Adapters should be updated when these documents change. A documentation link supports the `documented` label; a pinned runtime reproduction is still required for `verified`.

## Codex

- OpenAI, “Custom instructions with AGENTS.md”
  https://learn.chatgpt.com/docs/agent-configuration/agents-md

Key modeled claims: global/project discovery, `AGENTS.override.md` before `AGENTS.md`, one file per directory, root-to-working-directory concatenation, and the default 32 KiB project-document limit.

## Claude Code

- Anthropic, “How Claude remembers your project”
  https://code.claude.com/docs/en/memory

Key modeled claims: CLAUDE.md hierarchy, lazy subdirectory loading, `.claude/rules/`, `paths` frontmatter, import expansion up to four hops, and instructions as context rather than enforcement.

## Cursor

- Cursor documentation, “Rules”
  https://cursor.com/docs/context/rules

The documentation application is dynamically rendered and was not machine-verifiable in the build environment. `.mdc` frontmatter behavior is therefore labeled `inferred` until a pinned Cursor runtime fixture is added.

## GitHub Copilot

- GitHub, “Adding repository custom instructions for GitHub Copilot”
  https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions

Key modeled claims: `.github/copilot-instructions.md`, `.github/instructions/NAME.instructions.md`, `applyTo` matching, combined repository/path instructions, and nearest `AGENTS.md` precedence for agent instructions.

## v0.2.0 evidence refresh

- OpenAI, “Unrolling the Codex agent loop”
  https://openai.com/index/unrolling-the-codex-agent-loop/
- Anthropic, “Manage Claude's memory”
  https://docs.anthropic.com/en/docs/claude-code/memory
- Cursor, “Rules”
  https://docs.cursor.com/context/rules
- GitHub, “Adding repository custom instructions for GitHub Copilot in your IDE”
  https://docs.github.com/en/copilot/how-tos/configure-custom-instructions-in-your-ide/add-repository-instructions-in-your-ide
- GitHub, “Support for different types of custom instructions”
  https://docs.github.com/en/copilot/reference/custom-instructions-support

- npm, “Trusted publishing for npm packages”
  https://docs.npmjs.com/trusted-publishers/

## Codex source snapshot

- OpenAI Codex configuration schema, pinned source commit:
  https://github.com/openai/codex/blob/5c19155cbd93bfa099016e7487259f61669823ff/codex-rs/core/config.schema.json

Reviewed: **2026-07-11**. This source documents `project_doc_max_bytes` with a default of `32768` and ordered fallback file names. This project uses the current AGENTS.md documentation for `AGENTS.override.md` precedence. Known gaps remain configured fallback filenames, configured budgets, user-level instructions, and multi-environment behavior; none are reported as verified.
