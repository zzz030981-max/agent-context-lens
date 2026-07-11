import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
  noExternal: ["@agent-context-lens/core"],
  external: ["fast-glob", "gray-matter", "minimatch"]
});
