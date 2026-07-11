# Launch checklist

## Repository setup

- Create the public GitHub repository `agent-context-lens`.
- Enable Issues, Discussions, private vulnerability reporting, and branch protection.
- Set the repository description to: `DevTools for AI coding instructions — trace what Codex, Claude Code, Cursor, and Copilot load for any file.`
- Add topics: `ai-agents`, `codex`, `claude-code`, `cursor`, `github-copilot`, `developer-tools`, `context-engineering`, `typescript`.

## First release

1. Push the repository.
2. Confirm the `CI success` required check passes on Node 20, 22, and 24.
3. Complete the manual first npm publication, then run the Release workflow from `main` to create `v0.2.0`.
4. Verify the source ZIP, package tarball, SPDX SBOM, release notes, and `SHA256SUMS` assets.
5. Pin an issue requesting version-pinned Cursor verification.

## README media

Record a 15–20 second GIF:

1. Start on `src/auth/login.ts`.
2. Show all-agent comparison.
3. Highlight npm/pnpm conflict.
4. Switch to `README.md` to demonstrate path rules disappearing.
5. End on the caveat/evidence panel.

Do not claim exact hidden prompts or guaranteed model compliance.
