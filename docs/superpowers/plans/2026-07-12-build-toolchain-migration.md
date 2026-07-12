# Build Toolchain Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace tsup with esbuild and TypeScript declaration generation so TypeScript 7 and esbuild 0.28.1 work without audit findings.

**Architecture:** Repository scripts build Core ESM plus declarations and build the CLI with Core bundled and runtime dependencies external. Existing package and server smoke tests validate the generated artifacts.

**Tech Stack:** Node.js scripts, esbuild 0.28.1, TypeScript 7.0.2, npm workspaces.

---

### Task 1: Establish the failing migration gate

**Files:**
- Modify: `packages/core/package.json`, `apps/cli/package.json`, `apps/web/package.json`
- Modify: `tsconfig.base.json`, `apps/cli/tsconfig.json`

- [x] Upgrade TypeScript declarations in all workspaces to `^7.0.2`.
- [x] Run `npm ci && npm run typecheck` and verify the known TypeScript 7 configuration failure before replacing tsup.

### Task 2: Replace Core and CLI bundling

**Files:**
- Create: `scripts/build-core.mjs`
- Create: `scripts/build-cli.mjs`
- Create: `packages/core/tsconfig.build.json`
- Modify: `packages/core/package.json`, `apps/cli/package.json`
- Delete: `apps/cli/tsup.config.ts`

- [x] Add Core ESM plus declaration build commands.
- [x] Add CLI ESM build with Core bundled and runtime packages external.
- [x] Run `npm run build` and inspect generated Core declarations and CLI entrypoint.

### Task 3: Remove tsup and make TypeScript 7 configuration valid

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `tsconfig.base.json`, `apps/cli/tsconfig.json`

- [x] Remove tsup dependencies and regenerate the lockfile.
- [x] Remove TypeScript 7-incompatible `baseUrl`; make the path mapping relative; set the CLI typecheck root to the repository root.
- [x] Run `npm audit --json` and verify no vulnerabilities remain.

### Task 4: Verify artifacts and publication readiness

**Files:**
- Test: existing `scripts/smoke-pack.mjs`, `scripts/smoke-installed-server.mjs`

- [x] Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:pack`, `npm run test:server-pack`, `npm run package:inspect`, `npm audit`, and `git diff --check`.
- [x] Commit, push, create a draft PR, and require the full GitHub matrix before merge.
