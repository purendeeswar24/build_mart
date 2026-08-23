param(
  [Parameter(Position = 0)]
  [ValidateSet("help", "venv", "install", "up", "down", "test", "test-unit", "test-dry", "test-all", "migrate", "typecheck")]
  [string]$Target = "help"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

switch ($Target) {
  "help" {
    Write-Host "BuildMart commands"
    Write-Host "  .\make.ps1 venv       create .venv reminder folder (optional)"
    Write-Host "  .\make.ps1 install    npm install"
    Write-Host "  .\make.ps1 up         start API :4000, shop :8081, admin :5173"
    Write-Host "  .\make.ps1 down       stop those processes"
    Write-Host "  .\make.ps1 test       unit tests (no server)"
    Write-Host "  .\make.ps1 test-dry   live hire/bid/bridge dry-run"
    Write-Host "  .\make.ps1 test-all   unit + dry-run"
    Write-Host "  .\make.ps1 migrate    apply database schema"
  }
  "venv" {
    New-Item -ItemType Directory -Force -Path ".venv" | Out-Null
    Write-Host "BuildMart uses Node, not pip. Next: .\make.ps1 install"
  }
  "install" { npm install }
  "up" { node scripts/stack.mjs up }
  "down" { node scripts/stack.mjs down }
  "test" { npm run test:unit --workspace=@buildmart/backend }
  "test-unit" { npm run test:unit --workspace=@buildmart/backend }
  "test-dry" { npm run test:dry --workspace=@buildmart/backend }
  "test-all" {
    npm run test:unit --workspace=@buildmart/backend
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run test:dry --workspace=@buildmart/backend
  }
  "migrate" { npm run db:migrate }
  "typecheck" { npm run typecheck --workspaces --if-present }
}
