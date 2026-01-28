# Day 5: AgenticLoop 的 ReAct 循环实现

## 学习目标
- 理解 ReAct 模式（Reasoning + Acting）
- 掌握迭代循环的实现
- 理解工具调用的执行流程
- 掌握并行工具调用
- 理解错误处理和重试机制
- 掌握取消机制（AbortSignal）

---

## 1. ReAct 模式

### 1.1 什么是 ReAct？

**ReAct = Reasoning（推理）+ Acting（行动）**

传统 AI：
```
用户问题 → LLM 生成答案 → 返回
```

ReAct 模式：
```
用户问题 
  ↓
LLM 推理：需要调用什么工具？
  ↓
执行工具（行动）
  ↓
LLM 推理：结果如何？还需要其他工具吗？
  ↓
继续执行工具 或 生成最终答案
  ↓
返回
```

### 1.2 ReAct 循环的优势

✅ **自主决策** - LLM 自己决定调用哪些工具
✅ **多步推理** - 可以执行多个步骤完成复杂任务
✅ **动态调整** - 根据工具结果调整后续行动
✅ **错误恢复** - 工具失败后可以尝试其他方法

---

## 2. AgenticLoop 核心结构

### 2.1 核心数据结构

```typescript
// 循环状态
interface LoopState {
  iteration: number;              // 当前迭代次数
  messages: LoopMessage[];        // 消息历史
  toolCalls: ToolCallRecord[];    // 工具调用记录
  status: LoopStatus;             // 状态
  startTime: Date;                // 开始时间
  endTime?: Date;                 // 结束时间
  error?: string;                 // 错误信息
}

// 循环状态类型
type LoopStatus = 
  | 'running'         // 运行中
  | 'completed'       // 完成
  | 'max_iterations'  // 达到最大迭代次数
  | 'cancelled'       // 被取消
  | 'error';          // 发生错误

// 消息格式
interface LoopMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;           // 工具调用 ID（tool 消息）
  toolCalls?: LLMToolCall[];     // 工具调用列表（assistant 消息）
}

// 工具调用记录
interface ToolCallRecord {
  id: string;                    // 工具调用 ID
  toolName: string;              // 工具名称
  arguments: Record<string, unknown>;  // 参数
  result: ToolResult;            // 执行结果
  timestamp: Date;               // 时间戳
  duration: number;              // 执行时长（毫秒）
}
```

### 2.2 配置选项

```typescript
interface LoopConfig {
  maxIterations: number;         // 最大迭代次数（默认 10）
  iterationTimeout: number;      // 单次迭代超时（默认 30000ms）
  parallelToolCalls: boolean;    // 是否并行执行工具（默认 true）
  continueOnError: boolean;      // 工具失败后是否继续（默认 true）
}
```

---

## 3. run() 方法完整流程

### 3.1 方法签名

```typescript
async run(
  userMessage: string,
  context: ToolContext,
  options: LoopRunOptions = {}
): Promise<LoopResult>
```

### 3.2 执行流程

```typescript
async run(userMessage, context, options) {
  // 1. 初始化状态
  const state: LoopState = {
    iteration: 0,
    messages: [],
    toolCalls: [],
    status: 'running',
    startTime: new Date(),
  };

  // 2. 添加系统提示
  if (options.systemPrompt) {
    state.messages.push({ role: 'system', content: options.systemPrompt });
  }

  // 3. 注入历史消息（无状态设计）
  if (options.history && options.history.length > 0) {
    state.messages.push(...options.history);
  }

  // 4. 添加用户消息
  state.messages.push({ role: 'user', content: userMessage });

  // 5. 主循环
  try {
    while (state.status === 'running') {
      // 检查迭代次数限制
      if (state.iteration >= maxIterations) {
        state.status = 'max_iterations';
        break;
      }

      // 检查取消信号
      if (options.abortSignal?.aborted) {
        state.status = 'cancelled';
        break;
      }

      // 执行一次迭代
      await this.executeIterationWithStreaming(state, context, options, sessionId);
      state.iteration++;
    }
  } catch (error) {
    // 错误处理
    if (isAbortError(error)) {
      state.status = 'cancelled';
    } else {
      state.status = 'error';
      state.error = error.message;
    }
  }

  state.endTime = new Date();

  // 6. 构建结果
  return this.buildResult(state);
}
```

---

## 4. executeIterationWithStreaming() 单次迭代

### 4.1 迭代流程

```typescript
private async executeIterationWithStreaming(state, context, options, sessionId) {
  const iterationStartTime = Date.now();
  const currentIteration = state.iteration + 1;

  // 1. 发送 iteration_started 事件
  onEvent?.(createIterationStartedEvent(sessionId, currentIteration, maxIterations));

  // 2. 获取工具定义
  const toolDefinitions = this.pluginManager.getToolDefinitions();

  // 3. 调用 LLM（带超时和取消支持）
  const llmResponse = await this.callLLMWithTimeout(
    state.messages,
    toolDefinitions,
    timeout,
    abortSignal
  );

  let toolCallCount = 0;

  // 4. 检查 LLM 是否要调用工具
  if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
    // 4a. LLM 决定调用工具
    
    // 添加 assistant 消息（包含工具调用）
    state.messages.push({
      role: 'assistant',
      content: llmResponse.content || '',
      toolCalls: llmResponse.toolCalls,
    });

    // 发送 content_chunk 事件
    if (llmResponse.content) {
      onEvent?.(createContentChunkEvent(sessionId, llmResponse.content, false));
    }

    // 执行工具调用
    const toolResults = await this.executeToolCallsWithStreaming(
      llmResponse.toolCalls,
      context,
      state,
      options,
      sessionId
    );

    toolCallCount = toolResults.length;

    // 添加工具结果为消息
    for (const result of toolResults) {
      state.messages.push({
        role: 'tool',
        content: JSON.stringify(result.result),
        toolCallId: result.id,
      });
    }

    // 继续循环（LLM 会在下次迭代中看到工具结果）
  } else {
    // 4b. LLM 生成最终答案（不调用工具）
    
    state.messages.push({
      role: 'assistant',
      content: llmResponse.content || '',
    });
    
    state.status = 'completed';  // 标记为完成

    // 发送最终 content_chunk 事件
    if (llmResponse.content) {
      onEvent?.(createContentChunkEvent(sessionId, llmResponse.content, true));
    }

    // 发送 decision 事件
    onEvent?.(createDecisionEvent(sessionId, 'Task completed successfully', true));
  }

  // 5. 发送 iteration_completed 事件
  const iterationDuration = Date.now() - iterationStartTime;
  onEvent?.(createIterationCompletedEvent(
    sessionId,
    currentIteration,
    iterationDuration,
    toolCallCount
  ));
}
```

### 4.2 关键决策点

```
LLM 返回结果
       │
       ├─ 有 toolCalls？
       │     │
       │     ├─ 是 → 执行工具 → 继续循环
       │     │
       │     └─ 否 → 生成最终答案 → 结束循环
       │
       └─ status = 'completed'
```

---

## 5. 工具调用执行

### 5.1 并行 vs 顺序执行

```typescript
private async executeToolCallsWithStreaming(toolCalls, context, state, options, sessionId) {
  const results: ToolCallRecord[] = [];

  if (this.config.parallelToolCalls && toolCalls.length > 1) {
    // 并行执行（更快）
    const promises = toolCalls.map(tc => 
      this.executeSingleToolCallWithStreaming(tc, context, options, sessionId)
    );
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // 顺序执行（更安全）
    for (const toolCall of toolCalls) {
      const result = await this.executeSingleToolCallWithStreaming(
        toolCall,
        context,
        options,
        sessionId
      );
      results.push(result);
    }
  }

  state.toolCalls.push(...results);
  return results;
}
```

**并行执行的优势：**
- ✅ 速度快（多个工具同时执行）
- ✅ 适合独立的工具调用

**顺序执行的优势：**
- ✅ 更安全（一个失败不影响其他）
- ✅ 适合有依赖关系的工具

### 5.2 单个工具调用

```typescript
private async executeSingleToolCallWithStreaming(toolCall, context, options, sessionId) {
  const startTime = Date.now();
  const toolName = toolCall.function.name;
  const toolCallId = toolCall.id;

  let result: ToolResult;
  let args: Record<string, unknown> = {};

  try {
    // 1. 解析参数
    args = JSON.parse(toolCall.function.arguments);

    // 2. 发送 tool_call_started 事件
    onEvent?.(createToolCallStartedEvent(sessionId, toolCallId, toolName, args));

    // 3. 获取工具
    const tool = this.pluginManager.getTool(toolName);
    if (!tool) {
      result = {
        success: false,
        content: `Tool not found: ${toolName}`,
        error: { code: 'TOOL_NOT_FOUND', message: '...' },
      };
      
      // 发送 tool_error 事件
      onEvent?.(createToolErrorEvent(sessionId, toolCallId, toolName, '...', true));
    } else {
      // 4. 执行工具
      result = await tool.execute(args, context);

      const duration = Date.now() - startTime;

      if (result.success) {
        // 发送 tool_call_completed 事件
        onEvent?.(createToolCallCompletedEvent(
          sessionId, toolCallId, toolName, true, duration, result.data
        ));
      } else {
        // 发送 tool_error 事件
        onEvent?.(createToolErrorEvent(
          sessionId, toolCallId, toolName, result.error?.message, true
        ));
      }
    }
  } catch (error) {
    // 5. 异常处理
    result = {
      success: false,
      content: `Tool execution failed: ${error.message}`,
      error: { code: 'EXECUTION_ERROR', message: error.message },
    };

    onEvent?.(createToolErrorEvent(sessionId, toolCallId, toolName, error.message, true));
  }

  return {
    id: toolCall.id,
    toolName,
    arguments: args,
    result,
    timestamp: new Date(),
    duration: Date.now() - startTime,
  };
}
```

---

## 6. 超时和取消机制

### 6.1 callLLMWithTimeout() 实现

```typescript
private async callLLMWithTimeout(
  messages,
  toolDefinitions,
  timeout,
  abortSignal?
) {
  // 1. 创建组合的 AbortController
  const controller = new AbortController();
  
  // 2. 设置超时
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // 3. 监听外部取消信号
  const onAbort = () => controller.abort();
  abortSignal?.addEventListener('abort', onAbort);

  try {
    // 4. 调用 LLM（传入组合的 signal）
    const response = await this.llm.generateWithTools(
      'tool_calling',
      this.formatMessagesForLLM(messages),
      toolDefinitions,
      { abortSignal: controller.signal }
    );

    return {
      content: response.content || '',
      toolCalls: response.toolCalls,
    };
  } finally {
    // 5. 清理资源
    clearTimeout(timeoutId);
    abortSignal?.removeEventListener('abort', onAbort);
  }
}
```

**关键点：**
- ✅ 组合超时和外部取消信号
- ✅ 使用 AbortController 统一管理
- ✅ finally 块确保资源清理

### 6.2 取消流程

```
用户点击取消按钮
  ↓
前端调用 abortController.abort()
  ↓
abortSignal.aborted = true
  ↓
AgenticLoop 检测到 abortSignal.aborted
  ↓
状态设置为 'cancelled'
  ↓
发送 decision 事件（cancelled）
  ↓
退出循环
```

---

## 7. 消息格式转换

### 7.1 内部格式 vs LLM 格式

```typescript
// 内部格式（LoopMessage）
{
  role: 'assistant',
  content: '我需要查询 Boss 统计',
  toolCalls: [{
    id: 'call_123',
    type: 'function',
    function: {
      name: 'get_boss_stats',
      arguments: '{"world":"main"}'  // JSON 字符串
    }
  }]
}

// LLM 格式（ChatMessage）
{
  role: 'assistant',
  content: '我需要查询 Boss 统计',
  toolCalls: [{
    id: 'call_123',
    name: 'get_boss_stats',
    arguments: { world: 'main' }  // 对象
  }]
}
```

### 7.2 formatMessagesForLLM()

```typescript
private formatMessagesForLLM(messages: LoopMessage[]): ChatMessage[] {
  return messages.map(msg => {
    const formatted: ChatMessage = {
      role: msg.role,
      content: msg.content,
    };

    if (msg.toolCallId) {
      formatted.toolCallId = msg.toolCallId;
    }

    // 转换 toolCalls 格式
    if (msg.role === 'assistant' && msg.toolCalls) {
      formatted.toolCalls = msg.toolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),  // 字符串 → 对象
      }));
    }

    return formatted;
  });
}
```

---

## 8. 完整示例

### 8.1 简单查询

```
用户: "查询 main 世界的 Boss 统计"

迭代 1:
  LLM 输入: [system, user]
  LLM 输出: toolCalls = [{ name: 'get_boss_stats', arguments: { world: 'main' } }]
  执行工具: get_boss_stats({ world: 'main' })
  工具结果: { total: 5, active: 3 }
  
迭代 2:
  LLM 输入: [system, user, assistant(toolCalls), tool(result)]
  LLM 输出: content = "main 世界共有 5 个 Boss，其中 3 个处于活跃状态。"
  状态: completed

返回: "main 世界共有 5 个 Boss，其中 3 个处于活跃状态。"
```

### 8.2 多步推理

```
用户: "创建一个火焰 Boss 并设置刷新点"

迭代 1:
  LLM: 需要先创建 Boss
  工具: create_boss({ name: 'FireBoss', type: 'flame' })
  结果: { success: true, bossId: 'boss_123' }

迭代 2:
  LLM: Boss 创建成功，现在设置刷新点
  工具: create_spawn_point({ bossId: 'boss_123', location: {...} })
  结果: { success: true, spawnId: 'spawn_456' }

迭代 3:
  LLM: 都完成了，生成最终答案
  输出: "已成功创建火焰 Boss (ID: boss_123) 并设置刷新点 (ID: spawn_456)。"
  状态: completed
```

---

## 9. 错误处理

### 9.1 工具执行失败

```typescript
// continueOnError = true（默认）
迭代 1:
  工具1: get_boss_stats() → 成功
  工具2: delete_boss() → 失败
  工具3: create_spawn() → 成功
  
  // 继续执行，LLM 会看到所有结果（包括失败的）

迭代 2:
  LLM 根据结果决定下一步
  // 可能重试失败的工具，或者采用其他方法
```

### 9.2 达到最大迭代次数

```typescript
迭代 10:
  状态: max_iterations
  发送事件: decision('Reached maximum iteration limit', false)
  返回: {
    status: 'max_iterations',
    content: '部分结果...',
    iterations: 10
  }
```

---

## 10. 总结

### 10.1 核心流程

```
run()
  ├─ 初始化状态
  ├─ 添加系统提示和历史消息
  ├─ 主循环 while (status === 'running')
  │   ├─ 检查迭代次数和取消信号
  │   ├─ executeIterationWithStreaming()
  │   │   ├─ 调用 LLM
  │   │   ├─ 检查是否有 toolCalls
  │   │   │   ├─ 有 → 执行工具 → 继续循环
  │   │   │   └─ 无 → 生成最终答案 → 结束
  │   │   └─ 发送流式事件
  │   └─ iteration++
  └─ 构建结果
```

### 10.2 关键特性

✅ **ReAct 模式** - LLM 自主决策工具调用
✅ **多步推理** - 支持复杂任务的多步骤执行
✅ **并行执行** - 多个工具可以并行调用
✅ **流式事件** - 实时反馈处理进度
✅ **超时控制** - 防止单次迭代耗时过长
✅ **取消支持** - 用户可以随时取消
✅ **错误恢复** - 工具失败后可以继续
✅ **无状态设计** - 历史消息从外部传入

---

Day 5 学习完成！你现在已经完全理解了 AgenticLoop 的 ReAct 循环实现。
