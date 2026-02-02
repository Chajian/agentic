# PowerShell CI 模拟脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "使用 Docker 模拟 GitHub Actions CI" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker Desktop 是否运行
Write-Host "检查 Docker 状态..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Desktop 未运行" -ForegroundColor Red
    Write-Host ""
    Write-Host "请启动 Docker Desktop，然后重新运行此脚本" -ForegroundColor Yellow
    Write-Host "或者按任意键继续使用备用方案（直接在 PowerShell 中运行命令）..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Write-Host ""
    Write-Host "使用备用方案：直接运行 CI 命令" -ForegroundColor Yellow
    Write-Host ""

    # 备用方案：直接运行命令
    $env:CI = "true"
    $env:NODE_ENV = "test"

    Write-Host "Step 1: Install dependencies" -ForegroundColor Green
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 2: Run linter" -ForegroundColor Green
    pnpm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Lint failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Lint passed" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 3: Check formatting" -ForegroundColor Green
    pnpm run format:check
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Format check failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Format check passed" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 4: Run type check" -ForegroundColor Green
    pnpm run typecheck
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Type check failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Type check passed" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 5: Build all packages" -ForegroundColor Green
    pnpm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build passed" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 6: Run tests" -ForegroundColor Green
    pnpm run test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Tests failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Tests passed" -ForegroundColor Green
    Write-Host ""

    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ 所有 CI 检查通过！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan

    exit 0
}

Write-Host "✅ Docker Desktop 正在运行" -ForegroundColor Green
Write-Host ""

# 设置代理
Write-Host "设置代理..." -ForegroundColor Yellow
$env:http_proxy = "http://127.0.0.1:7890"
$env:https_proxy = "http://127.0.0.1:7890"

# 构建 Docker 镜像
Write-Host "Step 1: 构建 Docker 镜像..." -ForegroundColor Green
docker build -f Dockerfile.ci -t agentic-ci:test .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 镜像构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker 镜像构建成功" -ForegroundColor Green
Write-Host ""

# 取消代理
Remove-Item Env:\http_proxy -ErrorAction SilentlyContinue
Remove-Item Env:\https_proxy -ErrorAction SilentlyContinue

# 运行 CI
Write-Host "Step 2: 运行 CI Workflow..." -ForegroundColor Green
Write-Host ""

docker run --rm -v "${PWD}:/workspace" agentic-ci:test sh -c "
echo '=== CI Workflow Simulation ==='
echo ''

echo 'Step 1: Install dependencies'
pnpm install --frozen-lockfile || exit 1
echo '✅ Dependencies installed'
echo ''

echo 'Step 2: Run linter'
pnpm run lint || exit 1
echo '✅ Lint passed'
echo ''

echo 'Step 3: Check formatting'
pnpm run format:check || exit 1
echo '✅ Format check passed'
echo ''

echo 'Step 4: Run type check'
pnpm run typecheck || exit 1
echo '✅ Type check passed'
echo ''

echo 'Step 5: Build all packages'
pnpm run build || exit 1
echo '✅ Build passed'
echo ''

echo 'Step 6: Run tests'
pnpm run test || exit 1
echo '✅ Tests passed'
echo ''

echo '=== All CI checks passed! ==='
"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ CI Workflow 模拟成功！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "❌ CI Workflow 模拟失败" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Cyan
    exit 1
}
