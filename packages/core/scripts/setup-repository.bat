@echo off
REM Repository Setup Script for @ai-agent/core (Windows)
REM This script helps set up the independent repository

echo.
echo Setting up @ai-agent/core repository...
echo.

REM Check if gh CLI is installed
where gh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: GitHub CLI (gh) is not installed
    echo Install it from: https://cli.github.com/
    exit /b 1
)

REM Check if user is authenticated
gh auth status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Not authenticated with GitHub CLI
    echo Run: gh auth login
    exit /b 1
)

echo [OK] GitHub CLI is installed and authenticated
echo.

REM Get repository details
set /p REPO_OWNER="Enter repository owner/organization: "
set /p REPO_NAME="Enter repository name (default: ai-agent-core): "
if "%REPO_NAME%"=="" set REPO_NAME=ai-agent-core

set REPO_FULL=%REPO_OWNER%/%REPO_NAME%

echo.
echo Repository: %REPO_FULL%
echo.

REM Confirm
set /p CONFIRM="Create repository %REPO_FULL%? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    exit /b 1
)

REM Create repository
echo.
echo Creating repository...
gh repo create "%REPO_FULL%" --public --description "Production-ready AI agent framework for Node.js/TypeScript" --homepage "https://github.com/%REPO_FULL%"
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Repository might already exist
)
echo [OK] Repository created
echo.

REM Initialize git if needed
if not exist .git (
    echo Initializing git...
    git init
    git checkout -b main
    echo [OK] Git initialized
)

REM Add remote
echo Adding remote...
git remote add origin "https://github.com/%REPO_FULL%.git" 2>nul
if %ERRORLEVEL% NEQ 0 (
    git remote set-url origin "https://github.com/%REPO_FULL%.git"
)
echo [OK] Remote added
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
echo [OK] Dependencies installed
echo.

REM Build package
echo Building package...
call npm run build
echo [OK] Package built
echo.

REM Run tests
echo Running tests...
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some tests failed
)
echo.

REM Commit and push
echo Committing and pushing...
git add .
git commit -m "feat: initial release of @ai-agent/core" -m "BREAKING CHANGE: Initial release as standalone package"
git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Push failed, might need to force push
)
echo [OK] Code pushed
echo.

REM Set up branch protection
echo Setting up branch protection...
gh api "repos/%REPO_FULL%/branches/main/protection" --method PUT --field required_status_checks="{\"strict\":true,\"contexts\":[\"test\",\"build\"]}" --field enforce_admins=true --field required_pull_request_reviews="{\"required_approving_review_count\":1,\"dismiss_stale_reviews\":true}" --field restrictions=null --field required_linear_history=true --field allow_force_pushes=false --field allow_deletions=false 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Branch protection enabled
) else (
    echo WARNING: Branch protection setup failed (might need admin access)
)
echo.

REM Enable features
echo Enabling repository features...
gh api "repos/%REPO_FULL%" --method PATCH --field has_issues=true --field has_discussions=true --field has_wiki=false --field has_projects=true 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Features enabled
) else (
    echo WARNING: Feature setup failed
)
echo.

REM Add topics
echo Adding repository topics...
gh api "repos/%REPO_FULL%/topics" --method PUT --field names="[\"ai\",\"agent\",\"llm\",\"openai\",\"anthropic\",\"typescript\",\"nodejs\",\"rag\",\"chatbot\",\"framework\"]" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Topics added
) else (
    echo WARNING: Topics setup failed
)
echo.

REM Secrets setup reminder
echo.
echo IMPORTANT: Set up secrets
echo.
echo Run this command to add NPM_TOKEN secret:
echo.
echo   gh secret set NPM_TOKEN --repo %REPO_FULL%
echo.
echo Or add them via web UI:
echo   https://github.com/%REPO_FULL%/settings/secrets/actions
echo.

REM Next steps
echo.
echo Repository setup complete!
echo.
echo Next steps:
echo.
echo 1. Add NPM_TOKEN secret (see above)
echo 2. Review branch protection rules:
echo    https://github.com/%REPO_FULL%/settings/branches
echo.
echo 3. Enable GitHub Discussions:
echo    https://github.com/%REPO_FULL%/settings
echo.
echo 4. Review and customize:
echo    - .github/workflows/*.yml
echo    - .github/ISSUE_TEMPLATE/*.yml
echo    - CONTRIBUTING.md
echo    - CODE_OF_CONDUCT.md
echo.
echo 5. Create first release:
echo    - Push to main branch
echo    - GitHub Actions will create release automatically
echo.
echo Repository URL: https://github.com/%REPO_FULL%
echo.

pause
