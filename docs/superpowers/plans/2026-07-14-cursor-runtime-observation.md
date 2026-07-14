# Cursor Runtime Observation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose agent-requested Cursor rule selection as a bounded, machine-readable runtime observation without promoting it into deterministic ContextLens output.

**Architecture:** Keep the fixed Cursor fixture and deterministic marker gate unchanged. Replace the probe's ambiguous boolean with a structured observation object plus hashes for the fixed prompt and response. The static Cursor adapter remains unchanged: semantic rules are still manual and inferred.

**Tech Stack:** Node.js built-ins, Vitest, TypeScript, GitHub Actions.

---

### Task 1: Define and emit bounded observation evidence

**Files:**
- Modify: `scripts/verify-cursor-runtime.mjs`
- Test: `packages/core/test/cursor-runtime.test.ts`

- [ ] **Step 1: Write failing tests for both observation states**

```ts
expect(evaluateRuntimeOutput("CURSOR_ALWAYS_MARKER CURSOR_TYPESCRIPT_MARKER CURSOR_REQUESTED_MARKER").requestedRuleObservation).toEqual({
  status: "observed",
  marker: "CURSOR_REQUESTED_MARKER",
  scope: "single-run",
  effectOnEffectiveContext: "none"
});

expect(evaluateRuntimeOutput("CURSOR_ALWAYS_MARKER CURSOR_TYPESCRIPT_MARKER").requestedRuleObservation.status).toBe("not-observed");
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- -t "Cursor runtime evidence"`

Expected: FAIL because `requestedRuleObservation` does not exist.

- [ ] **Step 3: Add the smallest structured observation**

```js
requestedRuleObservation: {
  status: output.includes("CURSOR_REQUESTED_MARKER") ? "observed" : "not-observed",
  marker: "CURSOR_REQUESTED_MARKER",
  scope: "single-run",
  effectOnEffectiveContext: "none"
}
```

Replace `requestedMarkerObserved` with this object. In `run()`, add `fixtureTarget: "src/probe.ts"` and SHA-256 hashes named `promptSha256` and `outputSha256`.

- [ ] **Step 4: Run focused and full tests**

Run: `npm test -- -t "Cursor runtime evidence"` then `npm test`

Expected: Cursor tests and all core tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-cursor-runtime.mjs packages/core/test/cursor-runtime.test.ts
git commit -m "feat: record Cursor semantic rule observations"
```

### Task 2: State the evidence boundary in public documentation

**Files:**
- Modify: `docs/ADAPTERS.md`
- Modify: `docs/RISK-REGISTER.md`

- [ ] **Step 1: Add documentation assertions by inspection**

Confirm documentation says that `observed` and `not-observed` describe one fixed CLI run only and never affect deterministic effective context.

- [ ] **Step 2: Add the concise boundary text**

In `docs/ADAPTERS.md`, document `requestedRuleObservation` and its four fields. In `docs/RISK-REGISTER.md`, state that an observed marker is evidence of one execution, not a prediction or promotion.

- [ ] **Step 3: Check documentation consistency**

Run: `rg -n "requestedMarkerObserved|requestedRuleObservation|effective context" docs packages/core scripts`

Expected: no stale reference to `requestedMarkerObserved`; all evidence language preserves the manual/inferred boundary.

- [ ] **Step 4: Commit**

```bash
git add docs/ADAPTERS.md docs/RISK-REGISTER.md
git commit -m "docs: explain Cursor runtime observation scope"
```

### Task 3: Verify through the actual Cursor CLI and release gates

**Files:**
- Verify only: `fixtures/cursor-runtime/`
- Verify only: `.github/workflows/cursor-runtime.yml`

- [ ] **Step 1: Run the pinned Cursor CLI probe**

Run the existing `cursor:verify` command with `CURSOR_AGENT_BIN` set to the authenticated pinned Cursor CLI executable.

Expected: JSON includes deterministic markers, a structured requested-rule observation, fixture target, prompt hash, and output hash. The command fails only if a deterministic marker is absent.

- [ ] **Step 2: Run release-relevant gates**

Run: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:server-pack`, `npm audit --omit=dev`, and `git diff --check`.

Expected: every command succeeds.

- [ ] **Step 3: Commit and publish the branch**

```bash
git add -A
git commit -m "test: verify Cursor observation evidence"
git push -u origin agent/cursor-runtime-observation
```

- [ ] **Step 4: Open a PR and verify remote CI**

Open a PR with the runtime evidence boundary and wait for all repository CI checks to pass. Keep the Cursor runtime workflow manual and secret-gated.
