# Cursor Live Verification Design

## Goal

Add an opt-in runtime probe that verifies the Cursor CLI's deterministic project-rule behavior without claiming that agent-requested rule selection is deterministic.

## Decision

Use a fixed fixture and the official `cursor-agent` CLI. The probe denies file, shell, and write tools, asks the model to return the marker strings supplied by its loaded rules, and checks only the `alwaysApply` and matching `globs` markers. A rule with no deterministic trigger is recorded as observed or absent, never promoted to verified.

## Inputs and outputs

- Fixture: `fixtures/cursor-runtime/` contains an always rule, a TypeScript glob rule, and an agent-requested rule with unique marker text.
- Script: `scripts/verify-cursor-runtime.mjs` runs a supplied `cursor-agent` binary, writes a concise JSON result to stdout, and exits nonzero when a deterministic marker is missing.
- Workflow: `.github/workflows/cursor-runtime.yml` is manual-only, installs the pinned official Cursor CLI build, requires `CURSOR_API_KEY`, and writes the version and JSON result to the job summary.

## Boundaries

- The probe does not modify the repository or use model tools.
- A successful run verifies one pinned CLI build and fixture only; it does not prove behavior for future Cursor versions or model-selected rules.
- Missing credentials are a failed precondition, not a passing verification.
