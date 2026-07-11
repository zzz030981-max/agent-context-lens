# Launch checklist

## Repository setup

- Create the public GitHub repository `agent-context-lens`.
- Enable Issues, Discussions, private vulnerability reporting, and branch protection.
- Set the repository description to: `DevTools for AI coding instructions — trace what Codex, Claude Code, Cursor, and Copilot load for any file.`
- Add topics: `ai-agents`, `codex`, `claude-code`, `cursor`, `github-copilot`, `developer-tools`, `context-engineering`, `typescript`.

## First release

1. Push the repository.
2. Confirm GitHub Actions passes on Node 20 and 22.
3. Create release `v0.1.0` from the initial commit.
4. Attach the source ZIP and a screenshot/GIF of the conflicting-rules fixture.
5. Pin an issue requesting pinned-version Cursor verification.

## README media

Record a 15–20 second GIF:

1. Start on `src/auth/login.ts`.
2. Show all-agent comparison.
3. Highlight npm/pnpm conflict.
4. Switch to `README.md` to demonstrate path rules disappearing.
5. End on the caveat/evidence panel.

Do not claim exact hidden prompts or guaranteed model compliance.
