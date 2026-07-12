# Publish the repository and package

## One-command GitHub publication on Windows

Open PowerShell in the project root and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\publish-github.ps1
```

The script:

1. installs GitHub CLI through `winget` when needed;
2. opens GitHub's official browser authorization flow;
3. configures Git credentials through `gh auth setup-git`;
4. verifies the working tree and runs all release checks;
5. creates `zzz030981-max/agent-context-lens` as a public repository, or connects the existing repository;
6. pushes `main`;
7. configures repository description, topics, Issues, Discussions, and labels;
8. configures the repository; releases are created later through the documented release flow.

The script deliberately stops when authenticated as the wrong account, the working tree is dirty, tests fail, or any known dependency vulnerability is present.

To publish the repository without creating the release:

```powershell
.\scripts\publish-github.ps1 -SkipRelease
```

## Manual fallback

Create an empty public repository named `agent-context-lens` under `zzz030981-max`, then run:

```bash
gh auth login
gh auth setup-git
git remote add origin https://github.com/zzz030981-max/agent-context-lens.git
git push -u origin main
```

## npm registry

GitHub publication does not publish the package to npm. Registry availability and ownership must be rechecked immediately before publication.

```bash
npm login
npm run test:pack
npm publish -w agent-context-lens
```

After npm publication:

```bash
npx agent-context-lens serve . --file src/index.ts
```

## Release workflow

After a release PR is merged, publish the matching package version, then run the manual **Release** workflow from `main`. It repeats validation, creates a source ZIP, package tarball, SPDX SBOM, release notes, and `SHA256SUMS`, then creates the GitHub release.

For the first npm publication, publish manually from the merged, version-tagged commit using an npm account with 2FA. Do not retain an npm token in GitHub Actions. After the package exists, configure npm Trusted Publishing for owner `zzz030981-max`, repository `agent-context-lens`, workflow `release.yml`, and the `npm publish` action. Only then run the Release workflow with `publish_npm=true` for later versions.

## Ongoing maintenance

- `.github/dependabot.yml` opens weekly dependency update pull requests.
- `.github/workflows/maintenance.yml` runs a weekly dependency audit, type checking, tests, production builds, and package smoke tests.
- `.github/workflows/ci.yml` validates every push and pull request on Linux, Windows, and macOS with Node.js 20 and 24, plus Ubuntu on Node.js 22.
- Human approval remains required for merges, releases, secret changes, and breaking behavior changes.
