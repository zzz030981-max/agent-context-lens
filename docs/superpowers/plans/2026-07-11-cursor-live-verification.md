# Cursor Live Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pinned, opt-in Cursor CLI probe for deterministic rules and document the remaining nondeterministic boundary.

**Architecture:** A controlled fixture contains unique rule markers. A dependency-free Node script launches the official CLI with restricted project permissions and checks the deterministic markers in its JSON response. A manual workflow supplies a secret only at runtime and records the pinned CLI version and probe result.

**Tech Stack:** Node.js 20+, Vitest, GitHub Actions, official Cursor CLI.

---

### Task 1: Add the fixture and a failing script test

**Files:**
- Create: `fixtures/cursor-runtime/.cursor/rules/always.mdc`
- Create: `fixtures/cursor-runtime/.cursor/rules/typescript.mdc`
- Create: `fixtures/cursor-runtime/.cursor/rules/requested.mdc`
- Create: `fixtures/cursor-runtime/.cursor/cli.json`
- Create: `fixtures/cursor-runtime/src/probe.ts`
- Create: `packages/core/test/cursor-runtime.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("requires the always and matching-glob markers while preserving agent-requested observation", async () => {
  const { evaluateRuntimeOutput } = await import("../../../scripts/verify-cursor-runtime.mjs");
  expect(evaluateRuntimeOutput("CURSOR_ALWAYS_MARKER CURSOR_TYPESCRIPT_MARKER CURSOR_REQUESTED_MARKER")).toEqual({
    deterministicMarkers: ["CURSOR_ALWAYS_MARKER", "CURSOR_TYPESCRIPT_MARKER"],
    requestedMarkerObserved: true
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- -t "requires the always"`

Expected: FAIL because `verify-cursor-runtime.mjs` does not exist.

### Task 2: Implement the minimal probe

**Files:**
- Create: `scripts/verify-cursor-runtime.mjs`
- Modify: `package.json`

- [ ] **Step 1: Export the evaluation function and CLI runner**

```js
export function evaluateRuntimeOutput(output) {
  const deterministicMarkers = ["CURSOR_ALWAYS_MARKER", "CURSOR_TYPESCRIPT_MARKER"]
    .filter(marker => output.includes(marker));
  if (deterministicMarkers.length !== 2) throw new Error("Cursor did not expose every deterministic marker.");
  return { deterministicMarkers, requestedMarkerObserved: output.includes("CURSOR_REQUESTED_MARKER") };
}
```

- [ ] **Step 2: Add `cursor:verify`**

```json
"cursor:verify": "node scripts/verify-cursor-runtime.mjs"
```

- [ ] **Step 3: Run the focused test**

Run: `npm test -- -t "requires the always"`

Expected: PASS.

### Task 3: Add manual CI and release documentation

**Files:**
- Create: `.github/workflows/cursor-runtime.yml`
- Modify: `docs/ADAPTERS.md`
- Modify: `docs/RISK-REGISTER.md`

- [ ] **Step 1: Add the pinned manual workflow**

```yaml
on:
  workflow_dispatch:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: test -n "$CURSOR_API_KEY"
      - run: node scripts/verify-cursor-runtime.mjs
```

- [ ] **Step 2: Document evidence scope**

State that a successful probe verifies only always-applied and matching-glob markers for the pinned CLI build, while agent-requested selection remains an observed, non-deterministic result.

- [ ] **Step 3: Run release-relevant checks**

Run: `npm test && npm run typecheck && npm run build && npm run release:dry-run`

Expected: all commands exit 0.
