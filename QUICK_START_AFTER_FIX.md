# 🚀 修复后快速开始指南

## ⚡ 立即需要做的事情

### 1️⃣ 配置 NPM Token（必须）

```
1. 访问: https://www.npmjs.com/settings/[your-username]/tokens
2. 点击 "Generate New Token" → 选择 "Automation"
3. 复制生成的 token
4. 访问: https://github.com/Chajian/agentic/settings/secrets/actions
5. 点击 "New repository secret"
   - Name: NPM_TOKEN
   - Value: 粘贴你的 token
6. 点击 "Add secret"
```

### 2️⃣ 提交更改（必须）

**使用 VS Code**:
```
1. 打开源代码管理面板 (Ctrl+Shift+G)
2. 点击 "+" 暂存所有更改
3. 输入提交消息: fix: resolve workflow conflicts and add lockfile
4. 点击 "✓ 提交"
5. 点击 "..." → "推送"
```

**或安装 Git 后使用命令行**:
```bash
git add .
git commit -m "fix: resolve workflow conflicts and add lockfile"
git push
```

### 3️⃣ 验证修复（推荐）

```
1. 访问: https://github.com/Chajian/agentic/actions
2. 等待 CI 工作流完成
3. 确认显示绿色 ✅
```

---

## 📝 修改的文件清单

### ✅ 已修复
- `.github/workflows/release.yml` - 更新为修复版本
- `.github/workflows/publish.yml` - 已删除（冲突）
- `packages/storage-memory/package.json` - 添加 workspace 依赖
- `packages/storage-prisma/package.json` - 添加 workspace 依赖
- `pnpm-lock.yaml` - 新生成（194 KB）

### 📄 新增文档
- `WORKFLOW_FIX_PLAN.md` - 修复计划
- `WORKFLOW_ISSUES_REPORT.md` - 问题报告
- `WORKFLOW_FIX_COMPLETED.md` - 完成报告
- `QUICK_START_AFTER_FIX.md` - 本文档

---

## 🎯 新的发布流程

### 如何发布新版本

```bash
# 1. 更新所有包的版本号
# 编辑以下文件，将 "version": "1.0.0" 改为 "1.0.1"
packages/core/package.json
packages/cli/package.json
packages/storage-memory/package.json
packages/storage-prisma/package.json

# 2. 提交更改
git add .
git commit -m "chore: bump version to 1.0.1"

# 3. 推送到 main（自动触发发布）
git push origin main

# 4. 等待 GitHub Actions 完成
# 访问: https://github.com/Chajian/agentic/actions
```

### 自动化流程

```
推送到 main
    ↓
运行测试 ✅
    ↓
构建包 ✅
    ↓
检查版本号
    ↓
发布到 npm ✅
    ↓
创建 GitHub Release ✅
```

---

## ⚠️ 重要提醒

### ❌ 不要做的事情

- ❌ 不要手动创建 GitHub Release（会触发已删除的 publish.yml）
- ❌ 不要在没有更新版本号的情况下推送到 main
- ❌ 不要删除 pnpm-lock.yaml

### ✅ 应该做的事情

- ✅ 每次发布前更新所有包的版本号（保持一致）
- ✅ 确保所有测试通过后再推送
- ✅ 使用语义化版本号（major.minor.patch）
- ✅ 在 CHANGELOG.md 中记录更改

---

## 🔍 验证工作流

### 检查 CI 是否通过

```
访问: https://github.com/Chajian/agentic/actions

应该看到:
✅ CI #22: All checks passed
   - Lint: ✅
   - Test (Node 18.x): ✅
   - Test (Node 20.x): ✅
   - Build: ✅
```

### 检查 Release 工作流

```
如果版本号未变:
⏭️ Release #5: Version already published, skipped

如果版本号改变:
✅ Release #6: Successfully published v1.0.1
   - Published to npm: ✅
   - GitHub Release created: ✅
```

---

## 🆘 遇到问题？

### CI 失败

1. 检查 pnpm-lock.yaml 是否已提交
2. 查看 Actions 日志获取详细错误
3. 本地运行测试: `pnpm run test`

### 发布失败

1. 检查 NPM_TOKEN 是否配置正确
2. 确保包名 @agenticc/* 可用
3. 确保版本号大于已发布版本

### 需要回滚

```bash
# 恢复备份文件
copy .github\workflows\*.backup .github\workflows\
git add .github/workflows/
git commit -m "revert: restore original workflows"
git push
```

---

## 📞 获取帮助

- 查看详细文档: `WORKFLOW_FIX_COMPLETED.md`
- 查看问题分析: `WORKFLOW_ISSUES_REPORT.md`
- 查看修复计划: `WORKFLOW_FIX_PLAN.md`
- GitHub Actions 日志: https://github.com/Chajian/agentic/actions

---

**快速参考版本**: 1.0  
**最后更新**: 2026-01-29
