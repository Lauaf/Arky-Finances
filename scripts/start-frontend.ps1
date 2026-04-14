$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot 'frontend'

Set-Location $frontendPath

if (-not (Test-Path 'node_modules')) {
  npm install
}

npm run start
