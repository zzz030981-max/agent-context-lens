# Changelog

All notable changes follow Keep a Changelog and Semantic Versioning.

## [0.1.1] - 2026-07-11

### Changed

- Separate the inspected target file from the agent working directory (`--cwd`).
- Model Codex project guidance from repository root through cwd, with the documented default 32 KiB budget.
- Distinguish Claude startup context, lazy nested context, and path-scoped rules; expose import limits and unresolved imports.
- Add Copilot cloud-agent and code-review surface selection plus `excludeAgent` support.
- Require a supplied base-branch checkout for Copilot code-review analysis.
- Reject realpath-based repository escapes and add release asset dry-run coverage.
- Upgrade JSON reports to schema 1.1 with working-directory and Copilot-surface metadata.

### Added

- Windows-safe package smoke coverage, adapter regression tests, and a manual v0.1.1 release workflow.

## [0.1.0] - 2026-07-11

### Added

- Repository-local adapters for Codex, Claude Code, Cursor, and GitHub Copilot.
- File-level effective-context tracing with evidence labels and caveats.
- Deterministic conflict, duplicate, reference, secret, dangerous-command, and budget analysis.
- CLI text and JSON reports.
- Local comparison UI served on `127.0.0.1`.
- Reproducible fixtures, tests, CI, security policy, and contribution guidelines.
