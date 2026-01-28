# Agentic

[![npm version](https://img.shields.io/npm/v/@agentic/core.svg)](https://www.npmjs.com/package/@agentic/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Chajian/agentic/workflows/CI/badge.svg)](https://github.com/Chajian/agentic/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

> 生产级 AI 智能体框架，支持无状态架构、多 LLM 和智能工具调用

[English](./README.md) | 简体中文

[文档](https://chajian.github.io/agentic/) | [示例](./packages/core/examples/) | [贡献指南](./CONTRIBUTING.zh-CN.md)

一个生产就绪的无状态 AI 智能体框架，用于构建具有 LLM 支持、RAG 和可扩展工具系统的智能对话应用。

## 🚀 核心特性

- **无状态架构** - 纯逻辑处理引擎，你完全控制存储
- **多 LLM 支持** - OpenAI、Anthropic Claude、自定义提供商
- **RAG 知识库** - 内存文档存储的语义搜索
- **可扩展工具** - 自定义功能的插件系统
- **流式事件** - 实时进度更新和指标
- **类型安全** - 完整的 TypeScript 支持
- **生产就绪** - 经过实战检验且文档完善

## 为什么选择 Agentic？

| 特性 | Agentic | LangChain | AutoGen |
|---------|-------------------|-----------|---------|
| **无状态架构** | ✅ 内置 | ❌ 有状态 | ❌ 有状态 |
| **多 LLM 任务路由** | ✅ 任务级别 | ⚠️ 手动 | ⚠️ 每个代理 |
| **水平扩展** | ✅ 原生支持 | ⚠️ 复杂 | ⚠️ 复杂 |
| **插件系统** | ✅ 命名空间隔离 | ✅ 丰富生态 | ⚠️ 基础 |
| **流式事件** | ✅ 15 种事件类型 | ✅ 基础 | ⚠️ 有限 |
| **生产就绪** | ✅ 是 | ⚠️ 不一定 | ⚠️ 偏研究 |
| **TypeScript** | ✅ 完整支持 | ⚠️ 部分 | ❌ 仅 Python |

## 📦 包列表

- **[@agentic/core](./packages/core)** - 核心智能体框架
- **[@agentic/storage-memory](./packages/storage-memory)** - 内存存储适配器
- **[@agentic/storage-prisma](./packages/storage-prisma)** - Prisma 存储适配器（SQL 数据库）
- **[@agentic/cli](./packages/cli)** - CLI 脚手架工具

## 🔧 快速开始

### 安装

```bash
npm install @agentic/core
# 或
pnpm add @agentic/core
```

### 基础使用

```typescript
import { Agent } from '@agentic/core';

const agent = new Agent({
  llm: {
    mode: 'single',
    default: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },
  },
});

// 从数据库加载历史记录
const history = await db.getMessages(sessionId);

// 使用无状态架构进行对话
const response = await agent.chat('你好！', {
  sessionId: 'user-123',
  history
});

// 将响应保存回数据库
await db.saveMessage(sessionId, response);

console.log(response.message);
```

### 使用自定义工具

```typescript
const plugin = {
  name: 'weather',
  version: '1.0.0',
  tools: [{
    name: 'get_weather',
    description: '获取当前天气',
    parameters: [
      { name: 'city', type: 'string', required: true }
    ],
    execute: async ({ city }) => {
      // 你的实现
      return { temperature: 22, condition: 'sunny' };
    },
  }],
};

await agent.loadPlugin(plugin);

const response = await agent.chat('东京的天气怎么样？', {
  sessionId: 'user-123',
  history: []
});
```

## 📚 文档

- [快速开始](./docs/getting-started.md)
- [API 参考](./docs/api-reference.md)
- [示例](./docs/examples.md)

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 📄 许可证

MIT

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.zh-CN.md) 了解详情。

## 💬 支持

- **文档**: https://chajian.github.io/agentic/
- **Issues**: https://github.com/Chajian/agentic/issues
- **讨论**: https://github.com/Chajian/agentic/discussions
- **邮箱**: xylyjy@gmail.com

## 🌟 Star History

如果这个项目对你有帮助，请给我们一个 Star ⭐️

## 📮 联系方式

- **GitHub**: [@Chajian](https://github.com/Chajian)
- **邮箱**: xylyjy@gmail.com
