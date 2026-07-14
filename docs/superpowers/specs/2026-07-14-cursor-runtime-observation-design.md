# Cursor Runtime Observation Design

## Goal

Make Cursor's agent-selected rule behavior auditable without representing a one-off model decision as deterministic effective context.

## Scope

The existing opt-in `cursor:verify` fixture will emit a structured observation for its agent-requested rule. The observation belongs only to that pinned Cursor CLI version, prompt, fixture target, and single execution. It will not change `InstructionSource.matched`, `loadMode`, confidence, token totals, or `includedSources`.

## Design

The probe JSON will replace the ambiguous `requestedMarkerObserved` boolean with a `requestedRuleObservation` object:

```json
{
  "status": "observed",
  "marker": "CURSOR_REQUESTED_MARKER",
  "scope": "single-run",
  "effectOnEffectiveContext": "none"
}
```

`status` is `observed` when the CLI response contains the marker and `not-observed` otherwise. `scope` is always `single-run`; neither state proves a future Cursor run will make the same semantic selection. `effectOnEffectiveContext` is always `none`, making the non-promotion rule machine-readable.

The JSON will also include the fixed fixture target path and SHA-256 hashes of the prompt and response. This makes an observation reproducible enough to compare probes while avoiding storage of model output in reports.

## Boundaries

- Deterministic `alwaysApply` and matching-glob markers remain the only pass/fail gates.
- The probe still needs the existing opt-in workflow and `CURSOR_API_KEY`; no secret is added to source control or normal CI.
- Generic repository rules are not probed automatically: no stable, safe Cursor API contract exists for mapping arbitrary semantic rule selection to a deterministic report.
- Static ContextLens reports keep agent-selected rules as `manual` and `inferred`.

## Files

- Modify `scripts/verify-cursor-runtime.mjs` to emit the structured observation and provenance hashes.
- Modify `packages/core/test/cursor-runtime.test.ts` to cover `observed` and `not-observed` without changing the deterministic gate.
- Modify `docs/ADAPTERS.md` and `docs/RISK-REGISTER.md` to define the observation boundary.

## Validation

1. Tests demonstrate both marker states and confirm neither affects deterministic markers.
2. The probe is run with the logged-in, pinned Cursor CLI against the fixed fixture.
3. `npm run typecheck`, `npm test`, `npm run build`, package-server smoke testing, and dependency audit pass.
4. The existing manual Cursor workflow is updated only if required by the artifact schema; it remains opt-in.

## Self-review

No placeholders remain. The design does not claim to predict model-selected rules, does not expand normal CI or secret access, and keeps the scope limited to audit evidence for the existing fixed probe.
