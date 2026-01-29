# 📝 提交代码指南

由于你的系统没有安装 git 命令行工具，请按照以下步骤使用 VS Code 的 Git 功能提交代码。

---

## 🎯 方法 1: 使用 VS Code 源代码管理（推荐）

### 步骤 1: 打开源代码管理面板

1. 点击左侧边栏的 **源代码管理图标**（分支图标）
2. 或按快捷键: `Ctrl + Shift + G`

### 步骤 2: 查看更改

你应该看到以下文件：

**修改的文件** (M):
- `.github/workflows/release.yml`
- `packages/storage-memory/package.json`
- `packages/storage-prisma/package.json`

**新增的文件** (U):
- `pnpm-lock.yaml`
- `WORKFLOW_FIX_PLAN.md`
- `WORKFLOW_ISSUES_REPORT.md`
- `WORKFLOW_FIX_COMPLETED.md`
- `QUICK_START_AFTER_FIX.md`
- `GITHUB_CONFIG_CHECK.md`
- `COMMIT_GUIDE.md`
- `scripts/fix-workflows.bat`

**删除的文件** (D):
- `.github/workflows/publish.yml`

### 步骤 3: 暂存所有更改

1. 在源代码管理面板中，找到 "更改" 部分
2. 点击 "更改" 旁边的 **+** 号（暂存所有更改）
3. 或者逐个点击每个文件旁边的 **+** 号

### 步骤 4: 输入提交消息

在顶部的消息框中输入：

```
fix: resolve workflow conflicts and add lockfile

- Remove conflicting publish.yml workflow
- Update release.yml with version check logic
- Add pnpm-lock.yaml for dependency locking
- Fix monorepo workspace dependencies
- Add comprehensive documentation
```

### 步骤 5: 提交

1. 点击 **✓ 提交** 按钮
2. 或按快捷键: `Ctrl + Enter`

### 步骤 6: 推送到远程仓库

1. 提交后，点击 **...** (更多操作)
2. 选择 **推送** 或 **Push**
3. 或点击底部状态栏的 **↑** 图标

---

## 🎯 方法 2: 使用 Kiro IDE 的 Git 功能

如果 Kiro IDE 有内置的 Git 功能：

1. 查找 Git 或源代码管理相关的面板
2. 暂存所有更改
3. 输入提交消息（见上方）
4. 提交并推送

---

## 🎯 方法 3: 安装 Git 后使用命令行

如果你想使用命令行，需要先安装 Git：

### 安装 Git for Windows

1. 访问: https://git-scm.com/download/win
2. 下载并安装 Git for Windows
3. 安装完成后，重启终端

### 使用命令行提交

安装 Git 后，在终端运行：

```bash
# 查看状态
git status

# 暂存所有更改
git add .

# 提交
git commit -m "fix: resolve workflow conflicts and add lockfile"

# 推送
git push
```

---

## ✅ 提交后验证

### 1. 检查 GitHub 仓库

访问: https://github.com/Chajian/agentic

应该看到：
- ✅ 最新提交显示你的提交消息
- ✅ 文件已更新

### 2. 检查 GitHub Actions

访问: https://github.com/Chajian/agentic/actions

应该看到：
- ✅ CI 工作流自动触发
- ✅ Release 工作流自动触发

### 3. 等待工作流完成

大约 2-3 分钟后：
- ✅ CI 应该显示绿色 ✓
- ✅ Release 应该显示 "Version already published, skipped"

---

## 📋 提交的文件清单

### 修改的文件 (3)
- [x] `.github/workflows/release.yml` - 修复后的发布工作流
- [x] `packages/storage-memory/package.json` - 添加 workspace 依赖
- [x] `packages/storage-prisma/package.json` - 添加 workspace 依赖

### 新增的文件 (8)
- [x] `pnpm-lock.yaml` - 依赖锁定文件 (194 KB)
- [x] `WORKFLOW_FIX_PLAN.md` - 修复计划
- [x] `WORKFLOW_ISSUES_REPORT.md` - 问题报告
- [x] `WORKFLOW_FIX_COMPLETED.md` - 完成报告
- [x] `QUICK_START_AFTER_FIX.md` - 快速开始指南
- [x] `GITHUB_CONFIG_CHECK.md` - 配置检查报告
- [x] `COMMIT_GUIDE.md` - 本文档
- [x] `scripts/fix-workflows.bat` - 修复脚本

### 删除的文件 (1)
- [x] `.github/workflows/publish.yml` - 冲突的工作流

### 备份文件（不需要提交）
- `.github/workflows/release.yml.backup`
- `.github/workflows/publish.yml.backup`

---

## ⚠️ 注意事项

1. **不要提交备份文件**
   - `.github/workflows/*.backup` 文件不需要提交
   - 它们只是本地备份

2. **确保 pnpm-lock.yaml 被提交**
   - 这个文件非常重要
   - 没有它，CI 会失败

3. **检查 .gitignore**
   - 确保没有忽略重要文件

---

## 🆘 遇到问题？

### 问题 1: VS Code 没有显示 Git 功能

**解决方案**:
- 确保 VS Code 已安装
- 确保打开的是项目根目录
- 检查是否是 Git 仓库（应该有 .git 文件夹）

### 问题 2: 推送失败（需要认证）

**解决方案**:
- VS Code 会弹出认证窗口
- 使用 GitHub 账号登录
- 或配置 SSH 密钥

### 问题 3: 推送被拒绝

**解决方案**:
- 可能需要先拉取远程更改
- 在 VS Code 中选择 "拉取" 或 "Pull"
- 然后再推送

---

## 📞 需要帮助？

如果遇到问题：
1. 截图错误信息
2. 告诉我具体的错误
3. 我会帮你解决

---

**创建时间**: 2026-01-29  
**目的**: 帮助提交工作流修复代码
