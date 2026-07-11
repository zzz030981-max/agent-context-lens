# Risk register and self-check

Last reviewed: **2026-07-11**.

## Highest remaining uncertainty

### Cursor rule selection

Cursor can select some rules semantically rather than through a deterministic path predicate. The pinned runtime probe verifies only `alwaysApply` and matching-glob markers; agent-requested selection remains model-dependent.

**Mitigation implemented:**

- `alwaysApply` and `globs` behavior is labeled `inferred`.
- Rules without deterministic triggers are shown as `manual` and excluded from effective context.
- The runtime workflow records the pinned Cursor build and its deterministic marker evidence.
- Agent-requested rules remain `inferred` or `manual` even after a successful probe.

## Important omissions discovered and resolved during development

### Monorepo success did not prove npm-package success

The first standalone package bundled a CommonJS dependency into ESM and failed after installation.

**Resolution:** runtime parser dependencies are now explicit package dependencies, the core is bundled safely, and `npm run test:pack` installs the generated tarball in a clean temporary project before executing the CLI.

### “Local server” initially listened on all interfaces

Express defaults could expose reports beyond the loopback interface despite the privacy claim.

**Resolution:** the server now binds explicitly to `127.0.0.1`, disables `X-Powered-By`, performs no writes, and exposes no CORS headers.

### Prefix-based path checks can be bypassed

A naive string-prefix check can confuse `/repo` with `/repo-other`.

**Resolution:** target containment now uses `path.relative` and rejects parent or absolute escapes. A regression test covers this case.

### Loose path extraction created false positives

Text such as `inferred/unknown` was initially mistaken for a filesystem path.

**Resolution:** plain-text references now require a file extension or explicit directory form. A self-scan and regression test confirm the fix.

### Dependency audit found a development-server advisory

A transitive `esbuild` version had a low-severity local development-server advisory.

**Resolution:** the patched version is pinned as a direct development dependency. `npm audit` currently reports zero known vulnerabilities.

## Remaining limitations users may not notice

- Token counts are estimates, not provider-native tokenizer results.
- Natural-language conflict detection is intentionally narrow and can miss paraphrases.
- User-level and managed organization instructions are not observable from a repository-only scan.
- Claude imports may intentionally load files outside the repository; generated reports can therefore contain sensitive local context even though nothing is uploaded.
- GitHub Copilot behavior differs by IDE, Chat, code review, and cloud-agent surface.
- Instruction context shapes model behavior but generally does not enforce it.
- A technically correct project does not guarantee GitHub stars; distribution, timing, trust, and maintenance remain separate work.

## Release gates

A release is blocked unless all of the following pass:

```bash
npm run typecheck
npm test
npm run build
npm run test:pack
npm audit
```
