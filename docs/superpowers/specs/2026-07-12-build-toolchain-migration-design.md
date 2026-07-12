# Build Toolchain Migration Design

**Goal:** Remove tsup so the repository can use TypeScript 7 and esbuild 0.28.1 without known toolchain blockers.

**Scope:** Preserve the Core ESM API, CLI executable, source maps, declaration output, Web-copy step, package contents, and existing command names. Do not change product behavior.

**Design:** Add two repository build scripts. The Core script invokes esbuild for ESM JavaScript and TypeScript for declarations. The CLI script invokes esbuild with Core bundled and runtime dependencies external, then runs the existing Web-copy script. TypeScript configuration is updated for TypeScript 7 by removing `baseUrl`, making the Core path mapping relative, and widening the CLI typecheck root to include bundled Core source.

**Success criteria:** `tsup` is absent from manifests and lockfile; `npm audit` reports no vulnerability; TypeScript 7 passes typecheck, tests, builds, installed-package smoke tests, and the GitHub matrix; generated packages retain the `contextlens` executable and local Web server behavior.

**Non-goals:** No application feature changes, no CLI option changes, no change to published runtime Node support, and no Git history rewrite.
