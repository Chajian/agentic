# NPM 发布指南 - @ai-agent/core

本文档说明如何将 @ai-agent/core 包发布到npm仓库。

## 前置准备

### 1. npm 账户
- 如果还没有，在 https://www.npmjs.com/signup 注册账户
- 确认邮箱

### 2. 本地登录
```bash
npm login
```
输入用户名、密码和邮箱后确认。

验证登录状态：
```bash
npm whoami
```

### 3. 验证包配置

检查package.json中的关键配置：
```json
{
  "name": "@ai-agent/core",
  "version": "1.0.0",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

**重要**: 确保：
- ✅ 包名是 `@ai-agent/core` (scoped package)
- ✅ 版本号递增
- ✅ access 设置为 "public"
- ✅ files 包含编译后的dist目录

## 发布流程

### 第1步：验证构建

```bash
cd D:/workspace/java/mc/frxx/xiancore-dashboard/packages/agent

# 清理并重新构建
npm run clean
npm run build

# 运行测试（如果有）
npm run test
```

确保没有错误输出。

### 第2步：检查打包内容

```bash
npm pack --dry-run
```

验证输出中包含：
- ✅ package.json
- ✅ README.md
- ✅ LICENSE
- ✅ dist/* (所有编译的JavaScript和TypeScript定义)
- ❌ src/ (应该被.npmignore排除)
- ❌ *.test.ts (应该被.npmignore排除)

### 第3步：更新版本号

根据 Semantic Versioning (semver) 更新版本：

```bash
# 查看当前版本
npm view @ai-agent/core version

# 更新版本 (选择一种)
npm version patch   # 1.0.0 -> 1.0.1 (bug修复)
npm version minor   # 1.0.0 -> 1.1.0 (新功能，向后兼容)
npm version major   # 1.0.0 -> 2.0.0 (破坏性更改)
```

**注意**: npm version 会自动更新package.json并创建git提交（如果在git仓库中）

### 第4步：发布到npm

```bash
npm publish --access public
```

如果启用了2FA认证，会提示输入OTP码。

### 第5步：验证发布

```bash
# 验证包已发布
npm view @ai-agent/core

# 查看最新版本
npm info @ai-agent/core version

# 查看npm上的页面
# https://www.npmjs.com/package/@ai-agent/core
```

## 发布后的集成步骤

### 在项目中安装

1. 在你的项目中安装：

```bash
cd /path/to/your/project
npm install @ai-agent/core@latest
```

2. 使用 Agent：

```typescript
import { Agent } from '@ai-agent/core';

let agentInstance: Agent | null = null;

export function getAgent(): Agent {
  if (!agentInstance) {
    agentInstance = new Agent({
      llm: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4',
      },
      behavior: {
        timeoutMs: 60000,
        maxIterations: 5,
        systemPrompt: 'You are a helpful assistant...',
      },
    });
  }
  return agentInstance;
}
```

## 常见问题

### 1. "需要email验证"
如果收到错误 "needs email verified"，请：
- 访问 https://www.npmjs.com/settings/profile
- 验证你的邮箱地址
- 重试发布

### 2. "无权发布此包"
可能原因：
- 还没有在npm.com上注册
- 使用了不同的npm账户
- 包名已被其他人注册

解决：
- 更改package.json中的包名（例如 @yourusername/agent）
- 运行 `npm whoami` 确认登录账户

### 3. "404 未找到"
发布后立即安装时可能会出现。等待几分钟让npm的CDN同步。

### 4. 需要撤销发布

```bash
npm unpublish @ai-agent/core@1.0.0 --force
```

**仅在必要时使用**，这会删除该版本，建议改为发布新版本修复问题。

## 更新发布

当需要发布新版本（修复bug或添加功能）时：

```bash
# 1. 修改代码
# 2. 更新版本
npm version patch

# 3. 验证构建
npm run build

# 4. 发布新版本
npm publish --access public
```

## 相关资源

- [npm 官方文档](https://docs.npmjs.com/)
- [Scoped Packages](https://docs.npmjs.com/cli/v8/using-npm/scope)
- [Semantic Versioning](https://semver.org/)
- [npm publish](https://docs.npmjs.com/cli/v9/commands/npm-publish)

## 发布清单

在发布前检查：

- [ ] npm 已登录 (`npm whoami`)
- [ ] 代码已提交到git
- [ ] 没有未跟踪的更改
- [ ] 构建成功 (`npm run build`)
- [ ] 测试通过 (`npm run test`)
- [ ] 版本号已更新
- [ ] README.md 是最新的
- [ ] package.json 中的 repository URL 是正确的
- [ ] 打包内容正确 (`npm pack --dry-run`)
- [ ] 没有 .npmrc 中的错误配置

## 发布后

发布完成后，在你的项目中更新依赖：

```bash
cd /path/to/your/project
npm install @ai-agent/core@latest
# 或指定版本
npm install @ai-agent/core@1.0.0
```

然后按照"发布后的集成步骤"更新你的代码实现。
