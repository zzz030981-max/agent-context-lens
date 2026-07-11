# Contributing

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
node apps/cli/dist/index.js serve fixtures/conflicting-rules --file src/auth/login.ts --no-open
```

## Adapter changes

Every resolver behavior must include one of the following:

1. A link to current official documentation.
2. A reproducible test against a pinned agent version.
3. An explicit `inferred` or `unknown` confidence label.

Do not silently promote inferred behavior to documented or verified behavior. Add or update a fixture for every change in matching, precedence, imports, or fallback semantics.

## Pull requests

Keep changes focused. Explain user impact, evidence, and validation. Never commit real credentials or private repository content in fixtures.
