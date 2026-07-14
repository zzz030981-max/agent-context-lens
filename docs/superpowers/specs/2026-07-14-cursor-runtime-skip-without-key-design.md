# Cursor Runtime Credential Skip Design

## Goal

Keep the optional Cursor runtime workflow green when its repository credential is not configured, while retaining a real verification run when the credential is available.

## Decision

The workflow will add one small guard job that checks whether `CURSOR_API_KEY` is non-empty and exposes `configured` as an output. The verification job will run only when that output is `true`; otherwise, a separate notice job will succeed and add an explicit skip message to the workflow summary.

## Rationale

Failing because an opt-in external credential is absent makes the repository look unhealthy even though the normal cross-platform CI is passing. A successful skip is truthful because it states that the live observation did not run. A configured credential continues to execute the existing download and runtime verification unchanged.

## Scope

- Modify only `.github/workflows/cursor-runtime.yml`.
- Add a static workflow test that asserts the guard, conditional verification, and skip notice remain present.
- Do not add dependencies, secrets, or changes to the primary CI workflow.

## Verification

The regression test must fail against the current workflow because it has no credential guard. It must pass after the workflow adds the guard. The existing test suite and static YAML parse must also pass.
