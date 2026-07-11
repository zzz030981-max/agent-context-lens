## What changed

- Separates target file from agent working directory.
- Corrects Codex project instruction discovery and budget reporting.
- Corrects Claude startup/lazy behavior and import diagnostics.
- Adds Copilot surface and `excludeAgent` handling.
- Upgrades report schema to 1.1 and adds the v0.1.1 release workflow.

## Why

The previous resolver could overstate effective context by treating the target-file directory as the agent startup directory.

## Validation

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:pack`
- `npm audit --audit-level=high`
- Clean tarball install test

## Remaining uncertainty

Cursor semantic rule selection remains nondeterministic and is reported as inferred/manual rather than deterministic context.
