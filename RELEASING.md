# Releasing Agent Context Lens

First publication is manual: merge a reviewed PR, verify `main`, create an immutable annotated tag, publish with an npm account protected by 2FA, then verify the public package before creating the GitHub Release. Do not store an npm token in the repository or GitHub Secrets for this flow.

After the first package exists, configure npm Trusted Publishing for `zzz030981-max/agent-context-lens`, workflow `release.yml`, and action `npm publish`. Later releases may use OIDC with `publish_npm=true`.

If a package is broken, prefer `npm deprecate` and a patch release. Do not unpublish routinely. If npm succeeds but the GitHub Release fails, repair the workflow and create the release from the existing immutable tag. Tags must never be moved.
