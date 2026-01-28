# CI/CD Configuration Validation Script (PowerShell)
# This script validates that all CI/CD components are properly configured

$ErrorActionPreference = "Continue"

Write-Host "🔍 Validating CI/CD Configuration..." -ForegroundColor Cyan
Write-Host ""

# Counters
$script:Passed = 0
$script:Failed = 0
$script:Warnings = 0

# Check function
function Test-Check {
    param(
        [string]$Description,
        [bool]$Condition
    )
    
    if ($Condition) {
        Write-Host "✓ $Description" -ForegroundColor Green
        $script:Passed++
    } else {
        Write-Host "✗ $Description" -ForegroundColor Red
        $script:Failed++
    }
}

function Write-Warning-Check {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
    $script:Warnings++
}

# 1. Check workflow files exist
Write-Host "📁 Checking workflow files..." -ForegroundColor Cyan
Test-Check "CI workflow exists" (Test-Path ".github/workflows/ci.yml")
Test-Check "Release workflow exists" (Test-Path ".github/workflows/release.yml")
Test-Check "Publish workflow exists" (Test-Path ".github/workflows/publish.yml")
Test-Check "Security workflow exists" (Test-Path ".github/workflows/security.yml")
Test-Check "Dependabot configuration exists" (Test-Path ".github/dependabot.yml")
Write-Host ""

# 2. Check semantic-release configuration
Write-Host "📦 Checking semantic-release configuration..." -ForegroundColor Cyan
Test-Check "semantic-release config exists" (Test-Path ".releaserc.json")

$packageJson = Get-Content "package.json" -Raw
Test-Check "semantic-release in package.json" ($packageJson -match '"semantic-release"')
Test-Check "@semantic-release/changelog installed" ($packageJson -match '@semantic-release/changelog')
Test-Check "@semantic-release/git installed" ($packageJson -match '@semantic-release/git')
Test-Check "@semantic-release/commit-analyzer installed" ($packageJson -match '@semantic-release/commit-analyzer')
Test-Check "@semantic-release/release-notes-generator installed" ($packageJson -match '@semantic-release/release-notes-generator')
Test-Check "@semantic-release/npm installed" ($packageJson -match '@semantic-release/npm')
Test-Check "@semantic-release/github installed" ($packageJson -match '@semantic-release/github')
Write-Host ""

# 3. Check package.json configuration
Write-Host "📝 Checking package.json configuration..." -ForegroundColor Cyan
Test-Check "Repository field configured" ($packageJson -match '"repository"')
Test-Check "semantic-release script exists" ($packageJson -match '"semantic-release"')
Test-Check "prepublishOnly script exists" ($packageJson -match '"prepublishOnly"')
Test-Check "test script exists" ($packageJson -match '"test"')
Test-Check "build script exists" ($packageJson -match '"build"')
Test-Check "type-check script exists" ($packageJson -match '"type-check"')
Test-Check "publishConfig exists" ($packageJson -match '"publishConfig"')
Write-Host ""

# 4. Check documentation
Write-Host "📚 Checking documentation..." -ForegroundColor Cyan
Test-Check "CI/CD documentation exists" (Test-Path ".github/CICD.md")
Test-Check "Release guide exists" (Test-Path ".github/RELEASE_GUIDE.md")
Test-Check "Setup summary exists" (Test-Path ".github/CICD_SETUP_SUMMARY.md")
Test-Check "Contributing guide exists" (Test-Path "CONTRIBUTING.md")
Write-Host ""

# 5. Check for required files
Write-Host "📄 Checking required files..." -ForegroundColor Cyan
Test-Check "README.md exists" (Test-Path "README.md")
Test-Check "LICENSE exists" (Test-Path "LICENSE")
Test-Check "package.json exists" (Test-Path "package.json")
Test-Check "tsconfig.json exists" (Test-Path "tsconfig.json")
Write-Host ""

# 6. Validate workflow syntax (basic check)
Write-Host "🔧 Validating workflow syntax..." -ForegroundColor Cyan
$ciWorkflow = Get-Content ".github/workflows/ci.yml" -Raw
Test-Check "CI workflow has triggers" ($ciWorkflow -match "on:")
Test-Check "CI workflow has jobs" ($ciWorkflow -match "jobs:")

$releaseWorkflow = Get-Content ".github/workflows/release.yml" -Raw
Test-Check "Release workflow has triggers" ($releaseWorkflow -match "on:")
Test-Check "Release workflow has jobs" ($releaseWorkflow -match "jobs:")
Write-Host ""

# 7. Check for secrets documentation
Write-Host "🔐 Checking secrets documentation..." -ForegroundColor Cyan
$cicdDoc = Get-Content ".github/CICD.md" -Raw
Test-Check "NPM_TOKEN documented" ($cicdDoc -match "NPM_TOKEN")
Test-Check "GITHUB_TOKEN documented" ($cicdDoc -match "GITHUB_TOKEN")
Write-Host ""

# 8. Warnings for optional items
Write-Host "⚠️  Checking optional configurations..." -ForegroundColor Cyan
if (-not (Test-Path "CHANGELOG.md")) {
    Write-Warning-Check "CHANGELOG.md not found (will be created on first release)"
}
if (-not (Test-Path ".npmignore")) {
    Write-Warning-Check ".npmignore not found (using files field in package.json)"
}
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Validation Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Passed: $script:Passed" -ForegroundColor Green
Write-Host "Failed: $script:Failed" -ForegroundColor Red
Write-Host "Warnings: $script:Warnings" -ForegroundColor Yellow
Write-Host ""

if ($script:Failed -eq 0) {
    Write-Host "✓ CI/CD configuration is valid!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Configure NPM_TOKEN secret in GitHub repository"
    Write-Host "2. Test the pipeline with a PR"
    Write-Host "3. Review .github/CICD.md for detailed documentation"
    exit 0
} else {
    Write-Host "✗ CI/CD configuration has issues" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the failed checks above."
    exit 1
}
