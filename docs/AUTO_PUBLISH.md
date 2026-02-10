# 自动发布到 NPM

本项目配置了自动发布到 NPM 的 GitHub Actions 工作流。

## 🚀 工作原理

每次推送到 `main` 分支时：
1. ✅ GitHub Actions 自动运行 CI（测试、构建）
2. ✅ 检查 package.json 中的版本号是否已发布
3. ✅ 如果是新版本，自动发布到 NPM
4. ✅ 创建 GitHub Release

## 📝 发布新版本的步骤

### 方法 1: 使用脚本（推荐）

**Windows:**
```bash
# 补丁版本 (1.0.0 -> 1.0.1)
scripts\bump-version.bat patch

# 次要版本 (1.0.0 -> 1.1.0)
scripts\bump-version.bat minor

# 主要版本 (1.0.0 -> 2.0.0)
scripts\bump-version.bat major
```

**Linux/Mac:**
```bash
# 补丁版本 (1.0.0 -> 1.0.1)
./scripts/bump-version.sh patch

# 次要版本 (1.0.0 -> 1.1.0)
./scripts/bump-version.sh minor

# 主要版本 (1.0.0 -> 2.0.0)
./scripts/bump-version.sh major
```

然后提交并推送：
```bash
git add -A
git commit -m "chore: bump version to x.x.x"
git push
```

### 方法 2: 手动更新

1. 更新所有 `packages/*/package.json` 中的版本号
2. 提交更改：
   ```bash
   git add -A
   git commit -m "chore: bump version to x.x.x"
   git push
   ```

## 🔧 配置要求

### GitHub Secrets

在 GitHub 仓库设置中添加以下 secret：

1. **NPM_TOKEN** (必需)
   - 访问 https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - 创建 "Automation" token
   - 复制 token 并添加到 GitHub Secrets

### 权限设置

确保 GitHub Actions 有以下权限：
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

在 Settings → Actions → General → Workflow permissions 中配置。

## 📦 版本号规范

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- **MAJOR (主版本)**: 不兼容的 API 修改
- **MINOR (次版本)**: 向下兼容的功能性新增
- **PATCH (修订号)**: 向下兼容的问题修正

示例：
- `1.0.0` → `1.0.1` (修复 bug)
- `1.0.0` → `1.1.0` (新增功能)
- `1.0.0` → `2.0.0` (破坏性更改)

## 🚫 跳过 CI

如果你想推送代码但不触发发布，在 commit 消息中添加 `[skip ci]`：

```bash
git commit -m "docs: update README [skip ci]"
```

## 📊 查看发布状态

- **GitHub Actions**: https://github.com/Chajian/agentic/actions
- **NPM 包**: https://www.npmjs.com/package/@agenticc/core
- **GitHub Releases**: https://github.com/Chajian/agentic/releases

## ⚠️ 注意事项

1. **首次发布**: 第一次发布需要手动运行 `npm publish`
2. **版本冲突**: 如果版本号已存在，发布会被跳过
3. **测试失败**: 如果测试失败，不会发布到 NPM
4. **构建失败**: 如果构建失败，不会发布到 NPM

## 🔍 故障排查

### 发布失败

1. 检查 GitHub Actions 日志
2. 确认 NPM_TOKEN 是否正确配置
3. 确认版本号是否已更新
4. 确认测试是否通过

### 版本号未更新

```bash
# 检查当前版本
cat packages/core/package.json | grep version

# 手动更新版本
cd packages/core
npm version patch
```

## 📚 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [NPM 发布文档](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [语义化版本](https://semver.org/lang/zh-CN/)
