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
