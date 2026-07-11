[CmdletBinding()]
param(
  [string]$Owner = "zzz030981-max",
  [string]$Repository = "agent-context-lens",
  [switch]$SkipRelease
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Require-Command([string]$Name, [string]$InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. $InstallHint"
  }
}

$RepoFullName = "$Owner/$Repository"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

Write-Step "Install or locate GitHub CLI"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id GitHub.cli --exact --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  } else {
    throw "GitHub CLI is missing and winget is unavailable. Install from https://cli.github.com/ and rerun this script."
  }
}
Require-Command gh "Install GitHub CLI from https://cli.github.com/."
Require-Command git "Install Git for Windows."
Require-Command npm "Install Node.js 20 or newer."

Write-Step "Authenticate GitHub CLI"
& gh auth status --hostname github.com 2>$null
if ($LASTEXITCODE -ne 0) {
  & gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub authentication failed." }
}
& gh auth setup-git
if ($LASTEXITCODE -ne 0) { throw "Could not configure Git credential integration." }

$Login = (& gh api user --jq .login).Trim()
if (-not $Login) { throw "Could not resolve the authenticated GitHub account." }
if ($Login -ne $Owner) {
  throw "Authenticated as '$Login', but the requested owner is '$Owner'. Re-authenticate or pass -Owner $Login."
}

Write-Step "Validate repository state"
$Changes = (& git status --porcelain)
if ($Changes) {
  throw "The working tree is not clean. Commit or discard changes before publishing.`n$Changes"
}
$Branch = (& git branch --show-current).Trim()
if ($Branch -ne "main") { throw "Expected branch 'main', found '$Branch'." }

Write-Step "Run release checks"
& npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
foreach ($Command in @("typecheck", "test", "build", "test:pack")) {
  & npm run $Command
  if ($LASTEXITCODE -ne 0) { throw "npm run $Command failed." }
}
& npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { throw "npm audit found high or critical vulnerabilities." }

Write-Step "Create or connect GitHub repository"
$RepositoryExists = $true
try {
  & gh repo view $RepoFullName --json nameWithOwner *> $null
  $RepositoryExists = $LASTEXITCODE -eq 0
} catch {
  $RepositoryExists = $false
}
if (-not $RepositoryExists) {
  & gh repo create $RepoFullName --public --source . --remote origin --push --description "DevTools for AI coding instructions: trace the effective context received by Codex, Claude Code, Cursor, and GitHub Copilot."
  if ($LASTEXITCODE -ne 0) { throw "Repository creation failed." }
} else {
  $Origin = (& git remote get-url origin 2>$null)
  if (-not $Origin) {
    & git remote add origin "https://github.com/$RepoFullName.git"
  }
  & git push -u origin main
  if ($LASTEXITCODE -ne 0) { throw "Push failed." }
}

Write-Step "Configure repository metadata"
& gh repo edit $RepoFullName `
  --description "DevTools for AI coding instructions: trace effective context across Codex, Claude Code, Cursor, and GitHub Copilot." `
  --enable-issues `
  --enable-discussions `
  --add-topic ai-agents `
  --add-topic codex `
  --add-topic claude-code `
  --add-topic cursor `
  --add-topic github-copilot `
  --add-topic developer-tools `
  --add-topic typescript `
  --add-topic static-analysis
if ($LASTEXITCODE -ne 0) { throw "Repository metadata configuration failed." }

foreach ($Label in @(
  @{ Name = "adapter"; Color = "7057ff"; Description = "Agent adapter behavior" },
  @{ Name = "accuracy"; Color = "d93f0b"; Description = "Resolver accuracy or evidence" },
  @{ Name = "security"; Color = "b60205"; Description = "Security-related work" },
  @{ Name = "good first issue"; Color = "7057ff"; Description = "Suitable for first-time contributors" }
)) {
  & gh label create $Label.Name --repo $RepoFullName --color $Label.Color --description $Label.Description --force | Out-Null
}

if (-not $SkipRelease) {
  Write-Step "Build release assets"
  $ReleaseDir = Join-Path $Root ".release"
  if (Test-Path $ReleaseDir) { Remove-Item $ReleaseDir -Recurse -Force }
  New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

  & git archive --format=zip --output (Join-Path $ReleaseDir "agent-context-lens-v0.1.0-source.zip") HEAD
  if ($LASTEXITCODE -ne 0) { throw "Source archive creation failed." }
  & npm pack -w agent-context-lens --pack-destination $ReleaseDir | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "npm package creation failed." }

  $ChecksumFile = Join-Path $ReleaseDir "SHA256SUMS.txt"
  Get-ChildItem $ReleaseDir -File | Where-Object Name -ne "SHA256SUMS.txt" | ForEach-Object {
    $Hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$Hash  $($_.Name)" | Add-Content -Path $ChecksumFile -Encoding utf8
  }

  $NotesFile = Join-Path $ReleaseDir "release-notes.md"
  @"
# Agent Context Lens v0.1.0

Initial public release.

- Trace effective repository instructions for Codex, Claude Code, Cursor, and GitHub Copilot.
- Compare agents, estimate token cost, and explain rule provenance.
- Detect conflicts, duplicates, broken references, possible secrets, and dangerous commands.
- Run locally with no API key, telemetry, or repository upload.

See `CHANGELOG.md` and `docs/RISK-REGISTER.md` for details and known limitations.
"@ | Set-Content -Path $NotesFile -Encoding utf8

  & gh release view v0.1.0 --repo $RepoFullName 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    & gh release create v0.1.0 `
      (Join-Path $ReleaseDir "agent-context-lens-v0.1.0-source.zip") `
      (Join-Path $ReleaseDir "agent-context-lens-0.1.0.tgz") `
      $ChecksumFile `
      --repo $RepoFullName `
      --target main `
      --title "Agent Context Lens v0.1.0" `
      --notes-file $NotesFile
    if ($LASTEXITCODE -ne 0) { throw "GitHub release creation failed." }
  } else {
    Write-Host "Release v0.1.0 already exists; leaving it unchanged." -ForegroundColor Yellow
  }
}

Write-Step "Published successfully"
& gh repo view $RepoFullName --web
Write-Host "Repository: https://github.com/$RepoFullName"
