# Migration to 0.2.0

Package version 0.2.0 contains the previously unreleased 0.1.1 changes. Report schema version remains 1.1.

- Reports include `workingDirectory` and `options.copilotSurface`.
- Copilot code review requires `--copilot-base-root` and reads repository/path instructions from that supplied base checkout.
- Generic `ide-chat` is no longer accepted because IDE behavior is not uniform.
- JSON consumers must accept schema 1.1 fields and preserve explicit `inferred`, `manual`, and `unknown` evidence labels.

The scan remains local and read-only. See the package README for `--cwd` and code-review examples.
