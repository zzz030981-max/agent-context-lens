# README Conversion Design

## Goal

Make the first 15 seconds of the repository page explain the concrete problem Agent Context Lens solves, while keeping installation and release information accurate.

## Scope

- Replace fixed `0.2.0` install commands with `@latest` / unpinned global installation.
- Add a small script that fails CI when the public README refers to a stale fixed package version.
- Reorder the English README around a concrete npm-versus-pnpm conflict, a short command, and representative CLI output.
- Add trust badges and a concise comparison with Agnix and Rulesync.
- Update repository topics to include `coding-agents`, `agents-md`, and `context-engineering`.
- Verify the existing social-preview asset is registered in GitHub repository settings when the available credentials permit it.

## Non-goals

- No changes to resolver behavior, report schema, package contents, or adapter evidence rules.
- No PR Context Diff, reusable GitHub Action, VS Code extension, new agent adapter, account service, or telemetry.
- No claim that the social preview is configured unless GitHub confirms it.

## Design

The README retains its centered identity block but starts with an explicit question: why one coding agent applies pnpm guidance while another applies npm guidance. A short invocation and representative text output make the answer visible before the technical reference material.

Badges use public GitHub and npm endpoints only. The version guard is a small Node script that reads `README.md`, rejects references to `agent-context-lens@<specific-version>`, and is run by the existing CI workflow. This makes the source README stable across future releases without adding release-time editing work.

The change is documentation-first; its automated behavior is limited to detecting an obsolete version-pinned invocation. The GitHub topic update is performed through the authenticated repository API after the code change is committed and pushed.

## Verification

- The new guard fails when given a README containing `agent-context-lens@0.2.0` and passes the production README.
- Typecheck, core tests, package smoke test, and a README version-guard run pass locally.
- The draft PR receives the normal cross-platform CI result before merge.
