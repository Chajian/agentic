# AI Agent 模块学习计划

## 学习目标
完全理解 `@ai-agent/core` 和 `@ai-agent/tools` 两个模块的设计与实现。

## 预计时间
5-7 天，每天 2-3 小时

---

## 第一天：理解项目结构和类型系统

### 学习目标
- 理解两个模块的职责划分
- 掌握核心类型定义

### 学习任务

#### 任务 1.1：阅读项目入口 (30分钟)
```
阅读文件：
- packages/agent/src/index.ts
- packages/agent-tools/src/index.ts
- packages/agent/package.json
- packages/agent-tools/package.json
```

**思考问题：**
1. agent 模块导出了哪些核心类？
2. agent-tools 依赖 agent 的哪些类型？
3. 两个模块的关系是什么？

#### 任务 1.2：学习工具类型 (45分钟)
```
阅读文件：
- packages/agent/src/types/tool.ts
```

**动手练习：**
写一个简单的工具定义（不需要实现）：
```typescript
// 练习：定义一个 "say_hello" 工具
const sayHelloTool: Tool = {
  name: 'say_hello',
  description: '???',  // 填写
  parameters: [???],   // 填写
  execute: async (args, context) => {
    // 返回什么？
  }
};
```

#### 任务 1.3：学习响应类型 (30分钟)
```
阅读文件：
- packages/agent/src/types/response.ts
```

**思考问题：**
1. 有哪 5 种响应类型？
2. 什么情况下返回 `clarify`？
3. 什么情况下返回 `confirm`？

#### 任务 1.4：学习配置类型 (30分钟)
```
阅读文件：
- packages/agent/src/types/config.ts
```

**思考问题：**
1. LLM 支持哪些 provider？
2. single 和 multi 模式有什么区别？
3. 不同任务可以用不同的 LLM 吗？

### 第一天检验
能回答以下问题：
- [ ] Tool 接口有哪些必填字段？
- [ ] ToolResult 的结构是什么？
- [ ] AgentResponse 有哪几种类型？

---

## 第二天：LLM 层

### 学习目标
- 理解 LLM 适配器模式
- 理解多 LLM 路由机制

### 学习任务

#### 任务 2.1：学习适配器接口 (30分钟)
```
阅读文件：
- packages/agent/src/llm/adapter.ts
```

**关键概念：**
- `LLMAdapter` 接口定义
- `generate()` vs `generateWithTools()` 的区别
- `ChatMessage` 的结构

#### 任务 2.2：学习 OpenAI 适配器实现 (45分钟)
```
阅读文件：
- packages/agent/src/llm/adapters/openai.ts
```

**重点关注：**
1. 构造函数如何初始化 OpenAI client
2. `generateWithTools()` 如何处理工具调用
3. 错误处理机制

**动手练习：**
画出 `generateWithTools()` 的流程图：
```
输入 messages + tools
       ↓
    ???
       ↓
    ???
       ↓
返回 LLMResponse
```

#### 任务 2.3：学习 LLM Manager (45分钟)
```
阅读文件：
- packages/agent/src/llm/manager.ts
```

**重点关注：**
1. `getLLMForTask()` 如何路由
2. `executeWithRetry()` 重试逻辑
3. fallback 机制

### 第二天检验
能回答以下问题：
- [ ] 如何添加一个新的 LLM provider？
- [ ] 重试机制是怎样的？
- [ ] 什么时候会使用 fallback LLM？

---

## 第三天：知识系统 (RAG)

### 学习目标
- 理解 RAG 检索增强生成
- 理解向量搜索原理

### 学习任务

#### 任务 3.1：学习知识存储 (45分钟)
```
阅读文件：
- packages/agent/src/knowledge/store.ts
```

**重点关注：**
1. `addDocument()` 如何存储文档
2. 文档分块 (chunking) 逻辑
3. 三种搜索方法的实现

**动手练习：**
```typescript
// 假设有以下文档
const doc = {
  category: 'boss',
  title: 'Boss配置指南',
  content: '这是一个很长的文档...'
};

// 问题：这个文档会被分成几块？分块的依据是什么？
```

#### 任务 3.2：学习向量嵌入 (30分钟)
```
阅读文件：
- packages/agent/src/knowledge/embedder.ts
```

**关键概念：**
- 什么是 embedding？
- 余弦相似度如何计算？
- 缓存机制的作用

#### 任务 3.3：学习检索器 (45分钟)
```
阅读文件：
- packages/agent/src/knowledge/retriever.ts
```

**重点关注：**
1. `keywordSearch()` 实现
2. `semanticSearch()` 实现
3. `hybridSearch()` 如何合并结果

**动手练习：**
```
假设用户查询："如何创建火焰Boss"

关键词搜索结果：
- Doc A: score 0.8
- Doc B: score 0.6

语义搜索结果：
- Doc B: score 0.9
- Doc C: score 0.7

问题：混合搜索的最终排序是什么？（权重：关键词 30%，语义 70%）
```

### 第三天检验
能回答以下问题：
- [ ] 为什么需要文档分块？
- [ ] 混合搜索比单一搜索好在哪里？
- [ ] 如何判断知识是否充足？

---

## 第四天：核心循环 (AgenticLoop)

### 学习目标
- 理解 ReAct 模式
- 理解工具执行流程

### 学习任务

#### 任务 4.1：学习循环类型 (30分钟)
```
阅读文件：
- packages/agent/src/types/loop.ts
```

**关键概念：**
- `LoopStatus` 有哪些状态
- `LoopMessage` 的结构
- `LLMToolCall` 的结构

#### 任务 4.2：学习 AgenticLoop 实现 (60分钟) ⭐重点
```
阅读文件：
- packages/agent/src/core/agentic-loop.ts
```

**重点关注：**
1. `run()` 方法的主循环
2. `executeIterationWithStreaming()` 单次迭代
3. 工具调用的执行流程
4. 取消机制 (AbortSignal)

**动手练习：**
手动模拟一次循环：
```
用户消息："查询Boss统计"

迭代 1：
- LLM 输入：[system, user]
- LLM 输出：???
- 工具调用：???
- 工具结果：???

迭代 2：
- LLM 输入：???
- LLM 输出：???
- 循环结束原因：???
```

#### 任务 4.3：学习插件管理器 (45分钟)
```
阅读文件：
- packages/agent/src/core/plugin-manager.ts
```

**重点关注：**
1. `load()` 如何加载插件
2. 命名空间如何工作
3. 工具冲突如何处理

### 第四天检验
能回答以下问题：
- [ ] 循环什么时候结束？
- [ ] 工具调用失败会怎样？
- [ ] 如何取消正在执行的循环？

---

## 第五天：Agent 主类

### 学习目标
- 理解 Agent 如何整合所有组件
- 理解完整的消息处理流程

### 学习任务

#### 任务 5.1：学习 Agent 类 (90分钟) ⭐核心
```
阅读文件：
- packages/agent/src/core/agent.ts
```

**分段阅读：**
1. 构造函数：初始化了哪些组件？
2. `chat()` 方法：完整流程是什么？
3. `checkConfirmationNeeded()`：确认机制
4. `handleConfirmationResponse()`：确认处理

**动手练习：**
画出 `chat()` 方法的完整流程图：
```
chat(message, options)
       ↓
  检查 pendingConfirmation?
       ↓
    ???
       ↓
    ???
       ↓
  返回 AgentResponse
```

#### 任务 5.2：学习流式事件 (45分钟)
```
阅读文件：
- packages/agent/src/types/streaming.ts
```

**重点关注：**
1. 有哪些事件类型？
2. 事件的触发时机
3. 工厂函数如何创建事件

### 第五天检验
能回答以下问题：
- [ ] Agent 初始化时创建了哪些组件？
- [ ] 高风险操作如何触发确认？
- [ ] 流式事件的顺序是什么？

---

## 第六天：业务工具 (agent-tools)

### 学习目标
- 理解工具的具体实现
- 学会创建新工具

### 学习任务

#### 任务 6.1：学习 Boss 工具 (60分钟)
```
阅读文件：
- packages/agent-tools/src/tools/boss/index.ts
- packages/agent-tools/src/tools/boss/get-stats.ts
- packages/agent-tools/src/tools/boss/create-spawn.ts
```

**重点关注：**
1. 插件工厂模式
2. 依赖注入方式
3. 参数验证逻辑

#### 任务 6.2：学习 MythicMobs 工具 (60分钟)
```
阅读文件：
- packages/agent-tools/src/tools/mythicmobs/index.ts
- packages/agent-tools/src/tools/mythicmobs/read-mob.ts
- packages/agent-tools/src/tools/mythicmobs/save-mob.ts
```

**重点关注：**
1. 文件系统操作
2. YAML 解析和验证
3. 审计日志记录

#### 任务 6.3：动手练习 - 创建新工具 (60分钟)
```typescript
// 练习：创建一个 "list_worlds" 工具
// 功能：列出服务器所有世界

// 1. 定义服务接口
interface WorldService {
  listWorlds(): Promise<string[]>;
}

// 2. 创建工具工厂函数
export function createListWorldsTool(service?: WorldService): Tool {
  // 你的实现
}

// 3. 创建插件
export const createWorldPlugin: PluginFactory<{ worldService: WorldService }> = (deps) => {
  // 你的实现
};
```

### 第六天检验
能回答以下问题：
- [ ] 为什么用工厂函数而不是直接导出工具？
- [ ] 如何给工具添加审计日志？
- [ ] riskLevel 有什么作用？

---

## 第七天：知识文档和综合练习

### 学习目标
- 理解知识文档的作用
- 综合运用所学知识

### 学习任务

#### 任务 7.1：学习知识文档 (30分钟)
```
阅读文件：
- packages/agent-tools/src/knowledge/mythicmobs/examples.ts
- packages/agent-tools/src/knowledge/dashboard/overview.ts
```

**思考问题：**
1. 知识文档如何被 RAG 使用？
2. 好的知识文档应该包含什么？

#### 任务 7.2：阅读测试用例 (60分钟)
```
阅读文件：
- packages/agent/src/core/agent.test.ts
- packages/agent/src/core/agentic-loop.test.ts
- packages/agent-tools/src/tools/mythicmobs/mythicmobs.test.ts
```

**学习目标：**
通过测试用例理解预期行为

#### 任务 7.3：综合练习 (90分钟)
```
练习：从零开始追踪一个完整请求

用户输入："帮我创建一个名为 FireDragon 的 Boss 刷怪点，位置在 world 的 100, 64, 200"

追踪以下内容：
1. Agent.chat() 接收到什么参数？
2. RAG 检索返回了什么？
3. LLM 决定调用什么工具？
4. 工具执行的参数是什么？
5. 最终返回什么响应？
```

### 第七天检验
能完成以下任务：
- [ ] 独立创建一个新工具
- [ ] 独立创建一个新插件
- [ ] 解释完整的请求处理流程

---

## 学习资源

### 必读代码文件（按优先级）
1. `types/tool.ts` - 工具类型
2. `types/response.ts` - 响应类型
3. `core/agentic-loop.ts` - 核心循环
4. `core/agent.ts` - Agent 主类
5. `llm/manager.ts` - LLM 管理
6. `knowledge/retriever.ts` - 知识检索

### 推荐阅读顺序
```
Day 1: types/ 目录
Day 2: llm/ 目录
Day 3: knowledge/ 目录
Day 4: core/agentic-loop.ts + core/plugin-manager.ts
Day 5: core/agent.ts
Day 6: agent-tools/src/tools/
Day 7: 测试文件 + 综合练习
```

### 调试技巧
```typescript
// 在关键位置添加日志
context.logger?.info('调试信息', { key: value });

// 运行单个测试
pnpm test -- --grep "test name"

// 查看类型定义
// 在 VS Code 中按 F12 跳转到定义
```

---

## 学习检验清单

完成学习后，你应该能够：

### 概念理解
- [ ] 解释 ReAct 模式是什么
- [ ] 解释 RAG 是什么
- [ ] 解释 Function Calling 是什么
- [ ] 解释适配器模式的作用
- [ ] 解释依赖注入的好处

### 代码能力
- [ ] 创建一个新的 Tool
- [ ] 创建一个新的 Plugin
- [ ] 添加一个新的 LLM Provider
- [ ] 添加一个新的知识文档
- [ ] 修改 AgenticLoop 的行为

### 调试能力
- [ ] 追踪一个请求的完整流程
- [ ] 定位工具执行失败的原因
- [ ] 理解测试用例的意图

---

## 常见问题

### Q: 为什么要分 agent 和 agent-tools 两个包？
A: 关注点分离。agent 是通用框架，agent-tools 是业务实现。这样 agent 可以被其他项目复用。

### Q: 为什么用工厂函数创建工具？
A: 支持依赖注入。测试时可以注入 mock 服务，生产时注入真实服务。

### Q: AgenticLoop 和 Agent 的关系是什么？
A: Agent 是门面，AgenticLoop 是核心引擎。Agent 负责协调各组件，AgenticLoop 负责执行 ReAct 循环。

### Q: 流式事件有什么用？
A: 实时反馈。用户可以看到 Agent 正在做什么，而不是等待最终结果。

---

祝学习顺利！🚀
