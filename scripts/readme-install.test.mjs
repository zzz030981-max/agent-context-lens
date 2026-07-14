import assert from "node:assert/strict";
import test from "node:test";
import { findVersionPinnedInstallCommands } from "./readme-install.mjs";

test("finds version-pinned agent-context-lens install commands", () => {
  assert.deepEqual(findVersionPinnedInstallCommands("npx agent-context-lens@0.2.0 inspect ."), ["agent-context-lens@0.2.0"]);
});

test("accepts latest-tag and unpinned commands", () => {
  assert.deepEqual(
    findVersionPinnedInstallCommands("npx agent-context-lens@latest inspect .\nnpm install --global agent-context-lens"),
    [],
  );
});
