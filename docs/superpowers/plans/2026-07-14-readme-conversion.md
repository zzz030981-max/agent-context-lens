# README Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the repository README into a concrete, accurate first-run demonstration and prevent stale version-pinned installation commands from returning.

**Architecture:** Keep the change documentation-first. A small Node validation module exposes a pure function for tests and a CLI entrypoint used by the existing CI workflow. README content is reordered without changing CLI behavior or packaging.

**Tech Stack:** Markdown, Node.js built-ins, Node test runner, GitHub Actions, GitHub repository API.

---

### Task 1: Guard public installation commands

**Files:**
- Create: `scripts/readme-install.mjs`
- Create: `scripts/readme-install.test.mjs`
- Create: `scripts/check-readme-install.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { findVersionPinnedInstallCommands } from "./readme-install.mjs";

test("finds version-pinned agent-context-lens install commands", () => {
  assert.deepEqual(findVersionPinnedInstallCommands("npx agent-context-lens@0.2.0 inspect ."), ["agent-context-lens@0.2.0"]);
});

test("accepts latest-tag and unpinned commands", () => {
  assert.deepEqual(findVersionPinnedInstallCommands("npx agent-context-lens@latest inspect .\nnpm install -g agent-context-lens"), []);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test scripts/readme-install.test.mjs`

Expected: failure because `scripts/readme-install.mjs` does not exist.

- [ ] **Step 3: Add the minimal parser and CLI check**

```js
export function findVersionPinnedInstallCommands(markdown) {
  return [...markdown.matchAll(/agent-context-lens@(?!latest\\b)[^\\s`]+/g)].map(match => match[0]);
}
```

The CLI reads `README.md`, throws with each match when the list is non-empty, otherwise logs a success line.

- [ ] **Step 4: Add the package script and CI invocation**

```json
"readme:check": "node scripts/check-readme-install.mjs"
```

Add `npm run readme:check` after `npm run versions:check` in both CI jobs.

- [ ] **Step 5: Run unit and production checks**

Run: `node --test scripts/readme-install.test.mjs && npm run readme:check`

Expected: two passing tests and a passing production README check.

- [ ] **Step 6: Commit**

```bash
git add package.json .github/workflows/ci.yml scripts/readme-install.mjs scripts/readme-install.test.mjs scripts/check-readme-install.mjs
git commit -m "ci: guard public install commands"
```

### Task 2: Convert the README first screen

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the fixed quick-start instructions**

Use:

```bash
npx -y agent-context-lens@latest inspect . --file src/index.ts --cwd . --agent all
npm install --global agent-context-lens
```

- [ ] **Step 2: Reorder the introductory content**

Start the first section with the npm-versus-pnpm question, followed by a short `Context trace` output for `src/auth/login.ts`, then the shortest copyable command. Retain the existing claims: local, no API key, read-only, deterministic by default.

- [ ] **Step 3: Add credibility and differentiation**

Add npm, CI, Node, license, and release badges below the title. Add a three-row comparison table for Agent Context Lens, Agnix, and Rulesync, with the distinction that this project explains which instructions apply to a file.

- [ ] **Step 4: Verify the public README**

Run: `npm run readme:check && rg -n "agent-context-lens@0\\.2\\.0" README.md`

Expected: README check passes and `rg` finds no matches.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: lead with concrete context conflicts"
```

### Task 3: Apply repository discoverability metadata

**Files:**
- External setting: `zzz030981-max/agent-context-lens` repository topics
- External setting: `zzz030981-max/agent-context-lens` social preview

- [ ] **Step 1: Add missing repository topics**

Run: `gh repo edit zzz030981-max/agent-context-lens --add-topic coding-agents,agents-md,context-engineering`

- [ ] **Step 2: Verify topics**

Run: `gh repo view zzz030981-max/agent-context-lens --json repositoryTopics`

Expected: the result contains all three new topics plus the existing ones.

- [ ] **Step 3: Verify social preview configuration**

Inspect GitHub repository settings. If the available API/CLI does not expose a verifiable social-preview write operation, record that external limitation in the draft PR instead of claiming it was set.

### Task 4: Run full release-adjacent verification and open a draft PR

**Files:**
- Verify: `README.md`, CI workflow, package scripts, guard scripts

- [ ] **Step 1: Run local quality gates**

Run: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:pack`, `npm audit`, and `git diff --check`.

Expected: all commands exit successfully.

- [ ] **Step 2: Inspect the final diff**

Run: `git diff origin/main...HEAD --check && git diff origin/main...HEAD -- README.md package.json .github/workflows/ci.yml scripts`

Expected: only P0 README/guard/CI changes and planning documents are present.

- [ ] **Step 3: Push and open a draft pull request**

Push `agent/readme-conversion`, then create a draft PR titled `docs: improve first-run clarity` with the executed local verification commands.
