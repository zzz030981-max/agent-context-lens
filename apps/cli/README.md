# Agent Context Lens

See which repository instructions an AI coding agent receives for a target file. The scan is local, read-only, has no telemetry, and requires no API key.

Repository: https://github.com/zzz030981-max/agent-context-lens

## Install

```bash
npm install --global agent-context-lens@0.2.0
npx -y agent-context-lens@0.2.0 inspect . --file src/index.ts --cwd . --agent all
```

Node.js 20 or newer is required.

## Usage

```bash
contextlens inspect . --file src/index.ts --cwd . --agent all
contextlens serve . --file src/index.ts --cwd . --no-open
```

`--file` is the file being inspected. `--cwd` is the directory where the coding agent starts; it controls startup instruction inheritance and defaults to the repository root.

For Copilot code review, supply a separately prepared checkout of the PR base branch. The command never runs `git checkout` or reads Git history.

```bash
contextlens inspect ./feature-worktree \
  --file src/index.ts --cwd . --agent copilot \
  --copilot-surface code-review \
  --copilot-base-root ../main-worktree
```

The local server binds only to `127.0.0.1`. Exported reports can contain instruction text and should be handled accordingly.

## Limitations

Cursor semantic rule selection is nondeterministic and remains `inferred` or `manual`; static analysis cannot fully reproduce it. Copilot behavior differs by product surface, so only cloud-agent and code-review are modeled.
