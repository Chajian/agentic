# Agentic

[![npm version](https://img.shields.io/npm/v/@agentic/core.svg)](https://www.npmjs.com/package/@agentic/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Chajian/agentic/workflows/CI/badge.svg)](https://github.com/Chajian/agentic/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

[English](./README.md) | 简体中文

一个智能 AI 智能体框架，支持 LLM、ReAct 模式执行、RAG 知识检索和可扩展工具系统。

## 特性

- 🤖 **多 LLM 支持**: OpenAI、Anthropic Claude、Google Gemini
- 🔧 **工具调用系统**: 内置 ReAct 模式实现自主推理
- 📚 **RAG 知识库**: 语义搜索和文档检索
- 💬 **无状态架构**: 灵活的对话管理
- 📝 **审计日志**: 完整的操作跟踪
- 🔌 **插件系统**: 可扩展的自定义工具架构
- ⚡ **流式支持**: 实时响应流
- 🎯 **意图解析**: 智能请求理解

## 安装

```bash
npm install @agentic/core
```

## 快速开始

```typescript
import { Agent, ToolRegistry } from '@agentic/core';

// 使用 OpenAI 初始化智能体
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  },
});

// 定义一个工具
agent.tools.register({
  name: 'get_weather',
  description: '获取某个地点的天气信息',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' },
    },
    required: ['location'],
  },
  execute: async (params) => {
    // 实现你的工具逻辑
    return `${params.location} 的天气: ...`;
  },
});

// 使用智能体（无状态 - 从你的存储传入历史记录）
const response = await agent.chat('纽约的天气怎么样？', {
  history: [], // 从数据库加载
});
console.log(response);
```

## 配置

### LLM 提供商

#### OpenAI
```typescript
new Agent({
  llm: {
    provider: 'openai',
    apiKey: 'sk-...',
    model: 'gpt-4',
  },
});
```

#### Anthropic Claude
```typescript
new Agent({
  llm: {
    provider: 'anthropic',
    apiKey: 'sk-ant-...',
    model: 'claude-3-opus-20240229',
  },
});
```

#### Google Gemini
```typescript
new Agent({
  llm: {
    provider: 'openai', // 使用 OpenAI 适配器兼容 Gemini API
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-pro',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  },
});
```

### 工具注册表

```typescript
const tools = new ToolRegistry();

// 注册单个工具
tools.register({
  name: 'calculator',
  description: '执行数学计算',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string' },
    },
    required: ['expression'],
  },
  execute: async ({ expression }) => {
    return eval(expression);
  },
});

// 批量注册工具
tools.registerBatch([tool1, tool2, tool3]);
```

## 核心概念

### 无状态架构

Agentic 采用无状态设计 - 它不存储对话历史。你需要：

1. 从你的数据库/存储加载历史记录
2. 将历史记录传递给 `chat()` 方法
3. 将新消息保存回你的存储

```typescript
// 从数据库加载
const history = await db.getMessages(sessionId);

// 处理消息
const response = await agent.chat(userMessage, {
  sessionId,
  history
});

// 保存到数据库
await db.saveMessage(sessionId, {
  role: 'user',
  content: userMessage
});
await db.saveMessage(sessionId, {
  role: 'assistant',
  content: response.message
});
```

### 插件系统

插件允许你将相关工具组织在一起：

```typescript
const weatherPlugin = {
  name: 'weather',
  version: '1.0.0',
  description: '天气相关工具',
  tools: [
    {
      name: 'get_current_weather',
      description: '获取当前天气',
      parameters: [...],
      execute: async (params) => { ... }
    },
    {
      name: 'get_forecast',
      description: '获取天气预报',
      parameters: [...],
      execute: async (params) => { ... }
    }
  ]
};

await agent.loadPlugin(weatherPlugin);
```

### 流式响应

```typescript
const stream = await agent.chatStream('给我讲个故事', {
  sessionId: 'user-123',
  history: []
});

for await (const chunk of stream) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content);
  }
}
```

### 事件监听

```typescript
agent.on('tool:start', (event) => {
  console.log(`开始执行工具: ${event.toolName}`);
});

agent.on('tool:end', (event) => {
  console.log(`工具执行完成: ${event.toolName}`);
  console.log(`结果: ${event.result}`);
});

agent.on('error', (event) => {
  console.error(`错误: ${event.error.message}`);
});
```

## 高级用法

### 多 LLM 配置

为不同任务使用不同的 LLM：

```typescript
const agent = new Agent({
  llm: {
    mode: 'multi',
    models: {
      fast: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY
      },
      smart: {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: process.env.ANTHROPIC_API_KEY
      }
    },
    default: 'fast'
  }
});

// 为特定任务使用特定模型
const response = await agent.chat('复杂问题', {
  llmModel: 'smart'
});
```

### RAG 知识库

```typescript
import { KnowledgeStore } from '@agentic/core';

const knowledge = new KnowledgeStore();

// 添加文档
await knowledge.addDocument({
  id: 'doc1',
  content: '关于产品的重要信息...',
  metadata: { source: 'manual', page: 1 }
});

// 搜索相关文档
const results = await knowledge.search('产品特性', {
  limit: 5,
  threshold: 0.7
});

// 在智能体中使用
const agent = new Agent({
  llm: { ... },
  knowledge
});
```

### 自定义工具验证

```typescript
tools.register({
  name: 'send_email',
  description: '发送电子邮件',
  parameters: {
    type: 'object',
    properties: {
      to: { type: 'string', format: 'email' },
      subject: { type: 'string', minLength: 1 },
      body: { type: 'string' }
    },
    required: ['to', 'subject', 'body']
  },
  validate: async (params) => {
    // 自定义验证逻辑
    if (!params.to.endsWith('@company.com')) {
      throw new Error('只能发送到公司邮箱');
    }
  },
  execute: async (params) => {
    // 发送邮件
  }
});
```

## API 参考

### Agent

主要的智能体类。

#### 构造函数

```typescript
new Agent(config: AgentConfig)
```

#### 方法

- `chat(message: string, options?: ChatOptions): Promise<AgentResponse>`
- `chatStream(message: string, options?: ChatOptions): AsyncIterator<StreamChunk>`
- `loadPlugin(plugin: Plugin): Promise<void>`
- `unloadPlugin(pluginName: string): void`

### ToolRegistry

管理工具注册和执行。

#### 方法

- `register(tool: Tool): void`
- `registerBatch(tools: Tool[]): void`
- `unregister(toolName: string): void`
- `get(toolName: string): Tool | undefined`
- `list(): Tool[]`

### KnowledgeStore

管理文档和语义搜索。

#### 方法

- `addDocument(doc: Document): Promise<void>`
- `addDocuments(docs: Document[]): Promise<void>`
- `search(query: string, options?: SearchOptions): Promise<SearchResult[]>`
- `delete(docId: string): Promise<void>`

## 示例

查看 [examples](./examples/) 目录获取完整示例：

- [基础聊天机器人](./examples/basic-chatbot/)
- [带工具的智能体](./examples/agent-with-tools/)
- [RAG 系统](./examples/rag-system/)
- [多 LLM 路由](./examples/multi-llm/)
- [流式响应](./examples/streaming/)

## 许可证

MIT

## 贡献

欢迎贡献！请查看我们的[贡献指南](../../CONTRIBUTING.zh-CN.md)。

## 支持

- **文档**: https://chajian.github.io/agentic/
- **Issues**: https://github.com/Chajian/agentic/issues
- **讨论**: https://github.com/Chajian/agentic/discussions
