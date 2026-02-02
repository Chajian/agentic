# Final CI Simulation - All Fixes Applied

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Final Complete CI Simulation" -ForegroundColor Cyan
Write-Host "All Fixes Applied" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$env:CI = "true"
$env:NODE_ENV = "test"

$allPassed = $true

function Test-Step {
    param([string]$Name, [scriptblock]$Action)
    Write-Host "Step: $Name" -ForegroundColor Green
    try {
        & $Action
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PASSED: $Name" -ForegroundColor Green
            Write-Host ""
            return $true
        } else {
            Write-Host "FAILED: $Name (exit code: $LASTEXITCODE)" -ForegroundColor Red
            Write-Host ""
            return $false
        }
    } catch {
        Write-Host "FAILED: $Name (exception)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Install
if (-not (Test-Step "Install dependencies" { pnpm install --frozen-lockfile })) {
    $allPassed = $false
}

# Core package
Write-Host "--- Core Package ---" -ForegroundColor Yellow
Push-Location packages/core
if (-not (Test-Step "Core: Type check" { pnpm run typecheck })) { $allPassed = $false }
if (-not (Test-Step "Core: Build" { pnpm run build })) { $allPassed = $false }
Pop-Location

# CLI package
Write-Host "--- CLI Package ---" -ForegroundColor Yellow
Push-Location packages/cli
if (-not (Test-Step "CLI: Type check" { pnpm run typecheck })) { $allPassed = $false }
if (-not (Test-Step "CLI: Build" { pnpm run build })) { $allPassed = $false }
Pop-Location

# Storage packages
Write-Host "--- Storage Packages ---" -ForegroundColor Yellow
Push-Location packages/storage-memory
if (-not (Test-Step "Storage-Memory: Build" { pnpm run build })) { $allPassed = $false }
Pop-Location

Push-Location packages/storage-prisma
if (-not (Test-Step "Storage-Prisma: Build (with prebuild hook)" { pnpm run build })) { $allPassed = $false }
Pop-Location

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "SUCCESS: All packages built successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fixed Issues:" -ForegroundColor Green
    Write-Host "  1. claude.ts TypeScript syntax error" -ForegroundColor Green
    Write-Host "  2. Storage-Prisma Prisma Client generation" -ForegroundColor Green
} else {
    Write-Host "FAILED: Some checks did not pass" -ForegroundColor Red
}
Write-Host "==========================================" -ForegroundColor Cyan
