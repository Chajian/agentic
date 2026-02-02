# CI Simulation Script

Write-Host "=== CI Workflow Simulation ===" -ForegroundColor Cyan
Write-Host ""

# Set environment
$env:CI = "true"
$env:NODE_ENV = "test"

Write-Host "Environment:" -ForegroundColor Yellow
Write-Host "  Node: $(node --version)"
Write-Host "  CI: $env:CI"
Write-Host ""

# Step 1: Install
Write-Host "Step 1: Install dependencies" -ForegroundColor Green
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Install" -ForegroundColor Red
    exit 1
}
Write-Host "PASSED: Install" -ForegroundColor Green
Write-Host ""

# Step 2: Lint
Write-Host "Step 2: Run linter" -ForegroundColor Green
pnpm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Lint" -ForegroundColor Red
    exit 1
}
Write-Host "PASSED: Lint" -ForegroundColor Green
Write-Host ""

# Step 3: Format check
Write-Host "Step 3: Check formatting" -ForegroundColor Green
pnpm run format:check
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Format check" -ForegroundColor Red
    exit 1
}
Write-Host "PASSED: Format check" -ForegroundColor Green
Write-Host ""

# Step 4: Type check
Write-Host "Step 4: Run type check" -ForegroundColor Green
pnpm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Type check" -ForegroundColor Red
    exit 1
}
Write-Host "PASSED: Type check" -ForegroundColor Green
Write-Host ""

# Step 5: Build
Write-Host "Step 5: Build all packages" -ForegroundColor Green
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Build" -ForegroundColor Red
    exit 1
}
Write-Host "PASSED: Build" -ForegroundColor Green
Write-Host ""

# Step 6: Test
Write-Host "Step 6: Run tests" -ForegroundColor Green
pnpm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Tests" -ForegroundColor Red
    exit 1
}
Write-Host "PASSED: Tests" -ForegroundColor Green
Write-Host ""

Write-Host "=== ALL CI CHECKS PASSED ===" -ForegroundColor Green
