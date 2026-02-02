#!/bin/bash

# 快速验证脚本 - 针对 TypeScript 编译错误修复

set -e

echo "=========================================="
echo "快速验证 TypeScript 编译修复"
echo "=========================================="
echo ""

# 验证 1：检查修复是否正确
echo "1. 检查代码修复..."
if grep -q "for (const tc: ToolCall of msg.toolCalls)" packages/core/src/llm/adapters/claude.ts; then
    echo "❌ 错误：代码未修复"
    exit 1
elif grep -q "for (const tc of msg.toolCalls)" packages/core/src/llm/adapters/claude.ts; then
    echo "✅ 代码已正确修复"
else
    echo "⚠️  警告：未找到目标代码"
fi
echo ""

# 验证 2：使用 TypeScript 5.7.2 编译单个文件
echo "2. 使用 TypeScript 5.7.2 验证修复的文件..."
cd packages/core
if npx -y typescript@5.7.2 src/llm/adapters/claude.ts --noEmit 2>&1 | grep -i "error"; then
    echo "❌ TypeScript 5.7.2 编译失败"
    exit 1
else
    echo "✅ TypeScript 5.7.2 编译通过"
fi
cd ../..
echo ""

# 验证 3：使用最新版本 TypeScript 编译
echo "3. 使用 TypeScript 最新版本验证..."
cd packages/core
if npx -y typescript@latest src/llm/adapters/claude.ts --noEmit 2>&1 | grep -i "error"; then
    echo "❌ TypeScript 最新版本编译失败"
    exit 1
else
    echo "✅ TypeScript 最新版本编译通过"
fi
cd ../..
echo ""

echo "=========================================="
echo "✅ 所有验证通过！"
echo "=========================================="
echo ""
echo "预期结果："
echo "  ✅ CI Workflow 将会通过"
echo "  ✅ Release Workflow 将会通过"
echo ""
echo "下一步操作："
echo "  1. git add packages/core/src/llm/adapters/claude.ts"
echo "  2. git commit -m 'fix: remove type annotation from for...of loop'"
echo "  3. git push origin main"
echo "  4. 观察 GitHub Actions CI 结果"
