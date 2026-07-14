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
