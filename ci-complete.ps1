# Complete CI Simulation Script

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Complete CI/Release Workflow Simulation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$env:CI = "true"
$env:NODE_ENV = "test"

$failed = $false

# Function to run command and check result
function Run-Step {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkDir = "."
    )

    Write-Host "Step: $Name" -ForegroundColor Green

    Push-Location $WorkDir
    Invoke-Expression $Command
    $exitCode = $LASTEXITCODE
    Pop-Location

    if ($exitCode -eq 0) {
        Write-Host "PASSED: $Name" -ForegroundColor Green
        Write-Host ""
        return $true
    } else {
        Write-Host "FAILED: $Name" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Install dependencies
if (-not (Run-Step "Install dependencies" "pnpm install --frozen-lockfile")) {
    $failed = $true
}

# Core package checks
Write-Host "--- Core Package Checks ---" -ForegroundColor Yellow
if (-not (Run-Step "Core: Type check" "pnpm run typecheck" "packages/core")) {
    $failed = $true
}

if (-not (Run-Step "Core: Build" "pnpm run build" "packages/core")) {
    $failed = $true
}

if (-not (Run-Step "Core: Tests" "pnpm run test" "packages/core")) {
    $failed = $true
}

# CLI package checks
Write-Host "--- CLI Package Checks ---" -ForegroundColor Yellow
if (-not (Run-Step "CLI: Type check" "pnpm run typecheck" "packages/cli")) {
    $failed = $true
}

if (-not (Run-Step "CLI: Build" "pnpm run build" "packages/cli")) {
    $failed = $true
}

# Storage packages
Write-Host "--- Storage Packages Checks ---" -ForegroundColor Yellow
if (-not (Run-Step "Storage-Memory: Build" "pnpm run build" "packages/storage-memory")) {
    $failed = $true
}

if (-not (Run-Step "Storage-Prisma: Build" "pnpm run build" "packages/storage-prisma")) {
    $failed = $true
}

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
if ($failed) {
    Write-Host "FAILED: Some checks did not pass" -ForegroundColor Red
    exit 1
} else {
    Write-Host "SUCCESS: All CI checks passed!" -ForegroundColor Green
}
Write-Host "==========================================" -ForegroundColor Cyan
