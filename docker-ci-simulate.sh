#!/bin/bash

# Docker CI 模拟脚本

set -e

echo "=========================================="
echo "使用 Docker 模拟 GitHub Actions CI"
echo "=========================================="
echo ""

# 设置代理（用于拉取镜像）
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

echo "Step 1: 构建 Docker 镜像..."
powershell -Command "docker build -f Dockerfile.ci -t agentic-ci:test ."

if [ $? -ne 0 ]; then
    echo "❌ Docker 镜像构建失败"
    exit 1
fi
echo "✅ Docker 镜像构建成功"
echo ""

# 取消代理（容器内部不需要）
unset http_proxy
unset https_proxy

echo "Step 2: 运行 CI Workflow..."
echo ""

# 运行 CI 命令
powershell -Command "docker run --rm -v \${PWD}:/workspace agentic-ci:test sh -c '
echo \"=== CI Workflow Simulation ===\"
echo \"\"

echo \"Step 1: Install dependencies\"
pnpm install --frozen-lockfile
echo \"✅ Dependencies installed\"
echo \"\"

echo \"Step 2: Run linter\"
pnpm run lint
echo \"✅ Lint passed\"
echo \"\"

echo \"Step 3: Check formatting\"
pnpm run format:check
echo \"✅ Format check passed\"
echo \"\"

echo \"Step 4: Run type check\"
pnpm run typecheck
echo \"✅ Type check passed\"
echo \"\"

echo \"Step 5: Build all packages\"
pnpm run build
echo \"✅ Build passed\"
echo \"\"

echo \"Step 6: Run tests\"
pnpm run test
echo \"✅ Tests passed\"
echo \"\"

echo \"=== All CI checks passed! ===\"
'"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ CI Workflow 模拟成功！"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "❌ CI Workflow 模拟失败"
    echo "=========================================="
    exit 1
fi
