# Cursor Runtime Credential Skip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the optional Cursor runtime workflow report an explicit successful skip when its API key is absent.

**Architecture:** A tiny Node test reads the GitHub Actions YAML as text and protects its required guard and job conditions. The workflow uses a credential-check job output to select either the existing verification job or a successful explanatory notice job.

**Tech Stack:** GitHub Actions YAML, Node.js built-in test runner, Node.js `fs` and `assert`.

---

### Task 1: Add a regression test for the workflow contract

**Files:**
- Create: `scripts/cursor-runtime-workflow.test.mjs`
- Test: `scripts/cursor-runtime-workflow.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cursor runtime workflow skips honestly when its API key is absent", async () => {
  const workflow = await readFile(new URL("../.github/workflows/cursor-runtime.yml", import.meta.url), "utf8");
  assert.match(workflow, /credential-check:/);
  assert.match(workflow, /configured=/);
  assert.match(workflow, /if: needs\.credential-check\.outputs\.configured == 'true'/);
  assert.match(workflow, /Cursor runtime verification skipped/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/cursor-runtime-workflow.test.mjs`

Expected: FAIL because the current workflow has no `credential-check` job.

- [ ] **Step 3: Commit the failing test only after observing the expected failure**

```bash
git add scripts/cursor-runtime-workflow.test.mjs
git commit -m "test: define Cursor credential skip contract"
```

### Task 2: Add the minimal workflow guard

**Files:**
- Modify: `.github/workflows/cursor-runtime.yml`

- [ ] **Step 1: Add the credential-check output and route jobs from it**

```yaml
jobs:
  credential_check:
    runs-on: ubuntu-latest
    outputs:
      configured: ${{ steps.check.outputs.configured }}
    steps:
      - id: check
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: echo "configured=$([ -n \"$CURSOR_API_KEY\" ] && echo true || echo false)" >> "$GITHUB_OUTPUT"
  verify:
    needs: credential_check
    if: needs.credential_check.outputs.configured == 'true'
```

Add a `skipped` job with the inverse condition and `echo "Cursor runtime verification skipped: CURSOR_API_KEY is not configured." >> "$GITHUB_STEP_SUMMARY"`.

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `node --test scripts/cursor-runtime-workflow.test.mjs`

Expected: PASS.

- [ ] **Step 3: Commit the implementation**

```bash
git add .github/workflows/cursor-runtime.yml scripts/cursor-runtime-workflow.test.mjs
git commit -m "fix: skip Cursor runtime check without credentials"
```

### Task 3: Verify the repository remains release-safe

**Files:**
- Modify: none

- [ ] **Step 1: Let GitHub Actions parse the workflow on the draft pull request**

Run: `gh pr checks <PR_NUMBER> --watch`

Expected: GitHub accepts the workflow and the repository CI completes successfully. The manual Cursor workflow is not dispatched during this check.

- [ ] **Step 2: Run standard project verification**

Run: `npm run typecheck && npm test && npm run build && npm run readme:check && npm audit && git diff --check`

Expected: every command exits 0 and `npm audit` reports zero vulnerabilities.

- [ ] **Step 3: Create a draft pull request**

```bash
git push -u origin agent/cursor-runtime-skip-without-key
gh pr create --draft --base main --title "fix: skip Cursor runtime check without credentials" --body "## Summary\n- Skip the optional Cursor runtime observation when no repository credential exists.\n- Keep real runtime verification active when the credential is configured.\n- Add a regression test for the workflow contract.\n\n## Verification\n- node --test scripts/cursor-runtime-workflow.test.mjs\n- npm run typecheck\n- npm test\n- npm run build\n- npm run readme:check\n- npm audit"
```
