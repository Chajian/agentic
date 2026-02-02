# 本地模拟 GitHub Actions Workflow 指南

## 方法对比

| 方法 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **act** | 完整模拟 GitHub Actions | 需要 Docker | ⭐⭐⭐⭐⭐ |
| **手动执行命令** | 简单直接 | 不完全等同 CI 环境 | ⭐⭐⭐⭐ |
| **Docker Compose** | 环境隔离 | 配置复杂 | ⭐⭐⭐ |
| **GitHub Codespaces** | 完全等同 CI | 需要网络 | ⭐⭐⭐⭐ |

---

## 方法 1：使用 act（最推荐）

### 什么是 act？
- **act** 是一个开源工具，可以在本地运行 GitHub Actions
- 使用 Docker 容器模拟 GitHub Actions 的运行环境
- 支持大部分 GitHub Actions 功能

### 安装 act

#### Windows (使用 winget)
```bash
winget install nektos.act
```

#### 或使用 Chocolatey
```bash
choco install act-cli
```

#### 或使用 Scoop
```bash
scoop install act
```

### 验证安装
```bash
act --version
```

### 使用 act 运行 workflow

#### 1. 列出所有可用的 workflows
```bash
act -l
```

#### 2. 运行 CI workflow
```bash
# 运行 push 事件触发的 workflow
act push

# 运行特定的 workflow
act -W .github/workflows/ci.yml

# 运行特定的 job
act -j build
```

#### 3. 运行 Release workflow
```bash
# 模拟 push 到 main 分支
act push -W .github/workflows/release.yml

# 使用特定的 Docker 镜像（更接近 GitHub Actions）
act push -W .github/workflows/release.yml -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

#### 4. 调试模式
```bash
# 详细输出
act -v

# 交互式调试
act --bind

# 只列出步骤，不实际执行
act -n
```

### act 配置文件

创建 `.actrc` 文件来配置默认选项：

```bash
# .actrc
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--container-architecture linux/amd64
```

### 常见问题

#### 问题 1：Docker 未安装
```bash
# 需要先安装 Docker Desktop
# 下载地址: https://www.docker.com/products/docker-desktop
```

#### 问题 2：权限问题
```bash
# Windows: 以管理员身份运行
# Linux/Mac: 使用 sudo
```

#### 问题 3：secrets 未定义
```bash
# 创建 .secrets 文件
NPM_TOKEN=your_token_here
GITHUB_TOKEN=your_token_here

# 使用 secrets
act --secret-file .secrets
```

---

## 方法 2：手动执行 CI 命令（无需 Docker）

这是最简单的方法，直接执行 workflow 中的命令。

### 创建本地验证脚本

```bash
#!/bin/bash
# local-ci-test.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "本地 CI 验证脚本"
echo "=========================================="

# 模拟 CI 环境变量
export CI=true
export NODE_ENV=test

# Step 1: 安装依赖
echo ""
echo "Step 1: Install dependencies"
pnpm install --frozen-lockfile

# Step 2: Lint
echo ""
echo "Step 2: Run linter"
pnpm run lint

# Step 3: Format check
echo ""
echo "Step 3: Check formatting"
pnpm run format:check

# Step 4: Type check
echo ""
echo "Step 4: Run type check"
pnpm run typecheck

# Step 5: Build
echo ""
echo "Step 5: Build all packages"
pnpm run build

# Step 6: Test
echo ""
echo "Step 6: Run tests"
pnpm run test

echo ""
echo "=========================================="
echo "✅ 所有检查通过！"
echo "=========================================="
```

### 使用方法
```bash
chmod +x local-ci-test.sh
./local-ci-test.sh
```

---

## 方法 3：使用 Docker Compose

创建一个与 CI 环境完全一致的 Docker 环境。

### docker-compose.yml

```yaml
version: '3.8'

services:
  ci-test:
    image: node:20-alpine
    working_dir: /workspace
    volumes:
      - .:/workspace
      - /workspace/node_modules
    environment:
      - CI=true
      - NODE_ENV=test
    command: sh -c "
      corepack enable &&
      corepack prepare pnpm@9 --activate &&
      pnpm install --frozen-lockfile &&
      pnpm run lint &&
      pnpm run typecheck &&
      pnpm run build &&
      pnpm run test
    "
```

### 使用方法
```bash
# 运行 CI 测试
docker-compose run --rm ci-test

# 清理
docker-compose down -v
```

---

## 方法 4：针对当前问题的快速验证

由于你只需要验证 TypeScript 编译错误是否修复，可以使用最简单的方法：

### 快速验证脚本

```bash
#!/bin/bash
# quick-verify.sh

echo "快速验证 TypeScript 编译..."

# 使用 npx 直接运行 TypeScript 编译器
echo ""
echo "1. 验证修复的文件..."
npx -y typescript@5.7.2 packages/core/src/llm/adapters/claude.ts --noEmit --strict

if [ $? -eq 0 ]; then
    echo "✅ TypeScript 5.7.2 编译通过"
else
    echo "❌ TypeScript 5.7.2 编译失败"
    exit 1
fi

echo ""
echo "2. 验证整个 core 包..."
cd packages/core
npx -y typescript@5.7.2 --noEmit

if [ $? -eq 0 ]; then
    echo "✅ 整个 core 包编译通过"
else
    echo "❌ core 包编译失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 验证完成！预期 CI 将会通过"
echo "=========================================="
```

---

## 推荐方案（针对你的情况）

### 方案 A：如果有 Docker（最佳）

1. **安装 act**
   ```bash
   winget install nektos.act
   ```

2. **运行 CI workflow**
   ```bash
   act -W .github/workflows/ci.yml -j build
   ```

3. **观察输出**
   - 如果通过，说明修复有效
   - 如果失败，查看具体错误信息

### 方案 B：如果没有 Docker（推荐）

1. **创建验证脚本**
   ```bash
   # 创建 quick-verify.sh（见上面的脚本）
   chmod +x quick-verify.sh
   ```

2. **运行验证**
   ```bash
   ./quick-verify.sh
   ```

3. **手动执行 CI 步骤**
   ```bash
   pnpm install --frozen-lockfile
   pnpm run build
   pnpm run test
   ```

### 方案 C：最小验证（当前可用）

由于你的 pnpm 环境有问题，使用最小验证：

```bash
# 只验证 TypeScript 编译
cd packages/core
npx typescript@5.7.2 src/llm/adapters/claude.ts --noEmit

# 如果通过，说明语法错误已修复
```

---

## act 的高级用法

### 1. 只运行特定的 job
```bash
# 只运行 build job
act -j build

# 只运行 test job
act -j test
```

### 2. 使用不同的 runner 镜像
```bash
# 使用更大的镜像（包含更多工具）
act -P ubuntu-latest=catthehacker/ubuntu:full-latest

# 使用中等大小的镜像
act -P ubuntu-latest=catthehacker/ubuntu:act-latest

# 使用最小镜像
act -P ubuntu-latest=node:20-bullseye
```

### 3. 传递环境变量
```bash
act -e .github/workflows/ci.yml --env NODE_ENV=test
```

### 4. 模拟不同的事件
```bash
# 模拟 pull_request
act pull_request

# 模拟 push
act push

# 模拟 workflow_dispatch
act workflow_dispatch
```

### 5. 调试失败的步骤
```bash
# 在失败时保持容器运行
act --bind

# 进入容器调试
docker exec -it <container_id> /bin/bash
```

---

## 对比：本地验证 vs CI 验证

| 方面 | 本地验证 | CI 验证 |
|------|---------|---------|
| **速度** | ⚡ 快（无需等待队列） | 🐌 慢（需要排队） |
| **环境** | ⚠️ 可能不完全一致 | ✅ 完全一致 |
| **成本** | 💰 免费（本地资源） | 💰 消耗 CI 分钟数 |
| **调试** | 🔧 容易（可以交互） | 🔧 困难（只能看日志） |
| **可靠性** | ⚠️ 依赖本地环境 | ✅ 标准化环境 |

---

## 最佳实践

### 开发流程
1. **本地验证**（使用 act 或手动脚本）
2. **提交代码**
3. **观察 CI**
4. **如果失败，本地调试**
5. **重复直到通过**

### 提交前检查清单
- [ ] 本地运行 `pnpm run lint`
- [ ] 本地运行 `pnpm run typecheck`
- [ ] 本地运行 `pnpm run build`
- [ ] 本地运行 `pnpm run test`
- [ ] 使用 act 模拟 CI（可选）
- [ ] 提交代码

---

## 针对当前问题的建议

由于你的问题是 TypeScript 编译错误，最简单的验证方法是：

```bash
# 方法 1：使用 npx（无需安装依赖）
cd packages/core
npx typescript@5.7.2 src/llm/adapters/claude.ts --noEmit

# 方法 2：如果 pnpm 可用
pnpm install --frozen-lockfile
pnpm run build

# 方法 3：如果安装了 act
act -W .github/workflows/ci.yml -j build
```

**推荐顺序**：
1. 先尝试方法 1（最快）
2. 如果方法 1 通过，基本可以确定 CI 会通过
3. 如果想要 100% 确定，安装 act 并运行完整的 workflow

---

## 总结

- ✅ **最推荐**：安装 act，完整模拟 GitHub Actions
- ✅ **次推荐**：手动执行 CI 命令
- ✅ **最快速**：只验证 TypeScript 编译（针对当前问题）

你想使用哪种方法？我可以帮你设置。
