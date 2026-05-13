param(
  [string]$PatchPath = "patches/rocket-web-production-ui-final.patch"
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

$branch = (git branch --show-current).Trim()
if ($branch -ne "import/rocket-ui-source" -and $branch -ne "main") {
  Fail "Run this from import/rocket-ui-source, or from main after the Rocket source has been imported. Current branch: $branch"
}

if ($branch -eq "main") {
  $hasImportedSource = (Test-Path "apps/web/.rocket-source") -or (git cat-file -e "origin/import/rocket-ui-source^{commit}" 2>$null; $LASTEXITCODE -eq 0)
  if (-not $hasImportedSource) {
    Fail "main does not show imported Rocket source availability. Fetch/import origin/import/rocket-ui-source or restore apps/web/.rocket-source first."
  }
}

if (-not (Test-Path $PatchPath)) {
  Fail "Patch file not found: $PatchPath"
}

Write-Host "Applying Rocket web production UI patch from $PatchPath"
git apply --index $PatchPath
Write-Host "Patch applied. Current status:"
git status --short --branch
Write-Host "No secrets were read or modified by this script. Review, test, then commit the staged changes."
