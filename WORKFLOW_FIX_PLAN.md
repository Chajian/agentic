# GitHub Actions 工作流修复方案

## 🚨 当前问题

### 1. 双重发布工作流冲突

**问题描述**:
- `release.yml`: 推送到 main → 发布 npm → 创建 GitHub release
- `publish.yml`: GitHub release 创建 → 发布 npm

**后果**:
- 可能导致循环触发
- 同一版本重复发布
- npm 发布失败（版本已存在）

### 2. 所有工作流失败

从 Actions 历史可以看到：
- CI #21, #20, #19... 全部失败
- Release #4, #3, #2 全部失败  
- Deploy Documentation #4, #3, #2 全部失败

**可能原因**:
- 缺少 `pnpm-lock.yaml` 文件
- 测试配置问题
- 构建脚本错误
- 缺少必要的环境变量或 secrets

### 3. 包管理器不一致

- release.yml 使用 `pnpm`
- publish.yml 使用 `npm`
- 项目是 monorepo，应该统一使用 `pnpm`

## ✅ 推荐方案

### 方案 A: 保留 release.yml，删除 publish.yml（推荐）

**优点**:
- 自动化程度高
- 每次推送到 main 自动发布
- 避免重复发布

**流程**:
```
推送到 main → CI 测试 → 构建 → 检查版本 → 发布 npm → 创建 GitHub release
```

**操作**:
1. 删除 `.github/workflows/publish.yml`
2. 修复 `release.yml` 中的问题
3. 确保有 `pnpm-lock.yaml`

### 方案 B: 保留 publish.yml，删除 release.yml

**优点**:
- 手动控制发布时机
- 更安全，不会意外发布

**流程**:
```
手动创建 GitHub release → 触发 publish.yml → 发布 npm
```

**操作**:
1. 删除 `.github/workflows/release.yml`
2. 修复 `publish.yml`，改用 `pnpm`
3. 手动管理版本号

### 方案 C: 两者都保留，但添加条件判断（不推荐）

**缺点**:
- 复杂度高
- 容易出错
- 维护困难

## 🔧 具体修复步骤（方案 A）

### 步骤 1: 删除冲突的工作流

```bash
# 删除 publish.yml
rm .github/workflows/publish.yml
```

### 步骤 2: 修复 release.yml

需要修复的问题：

1. **添加 lockfile 检查**
```yaml
- name: Check lockfile
  run: |
    if [ ! -f "pnpm-lock.yaml" ]; then
      echo "Error: pnpm-lock.yaml not found"
      exit 1
    fi
```

2. **修复发布命令**
```yaml
- name: Publish to npm
  if: steps.version_check.outputs.should_publish == 'true'
  run: |
    cd packages/core && pnpm publish --access public --no-git-checks
    cd ../storage-memory && pnpm publish --access public --no-git-checks
    cd ../storage-prisma && pnpm publish --access public --no-git-checks
    cd ../cli && pnpm publish --access public --no-git-checks
```

3. **添加错误处理**
```yaml
- name: Publish to npm
  if: steps.version_check.outputs.should_publish == 'true'
  continue-on-error: false
  run: |
    # 发布前检查
    for pkg in core storage-memory storage-prisma cli; do
      cd packages/$pkg
      echo "Publishing @agentic/$pkg..."
      pnpm publish --access public --no-git-checks || exit 1
      cd ../..
    done
```

### 步骤 3: 生成 lockfile

```bash
# 在项目根目录运行
pnpm install
```

这会生成 `pnpm-lock.yaml` 文件，需要提交到 git。

### 步骤 4: 修复 CI 工作流

确保 CI 工作流能够正常运行：

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Run tests
  run: pnpm run test
  env:
    CI: true
```

### 步骤 5: 配置 npm token

在 GitHub 仓库设置中添加 secret：
1. 访问 https://github.com/Chajian/agentic/settings/secrets/actions
2. 添加 `NPM_TOKEN`
3. 值为你的 npm access token

### 步骤 6: 测试工作流

1. 创建一个测试分支
2. 修改版本号
3. 推送并观察 Actions 运行情况

## 📋 检查清单

- [ ] 删除 `publish.yml` 或 `release.yml`（二选一）
- [ ] 生成并提交 `pnpm-lock.yaml`
- [ ] 配置 `NPM_TOKEN` secret
- [ ] 修复 release.yml 中的发布命令
- [ ] 确保所有包的 package.json 配置正确
- [ ] 测试 CI 工作流
- [ ] 测试发布工作流（使用测试版本）

## 🎯 预期结果

修复后的工作流应该：
1. ✅ CI 在每次 PR 和推送时运行并通过
2. ✅ 推送到 main 时自动检查版本
3. ✅ 如果版本号变化，自动发布到 npm
4. ✅ 自动创建 GitHub release
5. ✅ 不会重复发布

## ⚠️ 注意事项

1. **版本管理**: 确保每次发布前手动更新 package.json 中的版本号
2. **测试**: 在发布前确保所有测试通过
3. **Monorepo**: 所有子包的版本号应该保持同步
4. **npm 权限**: 确保 npm token 有发布权限
5. **包名**: 确保 npm 上的包名可用（@agentic/core 等）

## 🔗 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [pnpm 发布文档](https://pnpm.io/cli/publish)
- [npm 发布文档](https://docs.npmjs.com/cli/v8/commands/npm-publish)
