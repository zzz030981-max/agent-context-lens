## Release preparation: 0.2.0

- Upgrades the package release from the unreleased 0.1.1 plan to 0.2.0 while retaining report schema 1.1.
- Hardens agent-resolution accuracy, Copilot code-review base-root handling, and realpath containment.
- Audits the npm tarball, tests installed CLI and loopback Web service, and builds source ZIP, tarball, SPDX SBOM, release notes, and SHA256SUMS.
- Adds Node 20/22/24 platform coverage, a stable `CI success` gate, a main-only release workflow, and public-registry post-release checks.

## Validation

- `npm ci`
- `npm run versions:check`
- `npm run typecheck`
- `npm test` (27 core tests)
- `npm run build`
- `npm run package:inspect`
- `npm run test:pack`
- `npm run test:server-pack`
- `npm run release:dry-run`
- `npm audit --audit-level=high`

## Remaining uncertainty

Cursor semantic selection remains inferred/manual. The npm package name is checked immediately before first publication because registry availability can change.
