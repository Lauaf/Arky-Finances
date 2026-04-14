$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot 'backend'

Set-Location $backendPath

python -m pip install -r requirements.txt
python -m app.init_db
