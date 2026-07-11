# Agent Context Lens contributor instructions

- Use npm workspaces. Do not introduce pnpm or yarn lockfiles.
- Keep the core resolver deterministic and read-only.
- Never execute commands extracted from scanned instruction files.
- Every adapter behavior must be documented, verified, or explicitly labeled inferred/unknown.
- Run `npm run typecheck`, `npm test`, and `npm run build` before submitting changes.
- Add a fixture and test for precedence, matching, or import behavior changes.
