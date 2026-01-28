# AI Agent 学习练习题

## 练习 1：理解 Tool 接口

### 题目
补全以下工具定义：

```typescript
import type { Tool, ToolResult, ToolContext } from '@ai-agent/core';

// 创建一个 "calculate" 工具，接收两个数字和一个操作符，返回计算结果
const calculateTool: Tool = {
  name: '???',
  description: '???',
  parameters: [
    // 补全参数定义
  ],
  riskLevel: '???',
  execute: async (args, context): Promise<ToolResult> => {
    // 补全执行逻辑
  }
};
```

### 参考答案
<details>
<summary>点击查看答案</summary>

```typescript
const calculateTool: Tool = {
  name: 'calculate',
  description: 'Performs basic arithmetic operations on two numbers. Supports add, subtract, multiply, divide.',
  parameters: [
    {
      name: 'a',
      type: 'number',
      description: 'First number',
      required: true,
    },
    {
      name: 'b',
      type: 'number',
      description: 'Second number',
      required: true,
    },
    {
      name: 'operation',
      type: 'string',
      description: 'Operation to perform',
      required: true,
      enum: ['add', 'subtract', 'multiply', 'divide'],
    },
  ],
  riskLevel: 'low',
  execute: async (args, context): Promise<ToolResult> => {
    const a = args.a as number;
    const b = args.b as number;
    const op = args.operation as string;

    let result: number;
    switch (op) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          return {
            success: false,
            content: 'Cannot divide by zero',
            error: { code: 'DIVIDE_BY_ZERO', message: 'Division by zero is not allowed' },
          };
        }
        result = a / b;
        break;
      default:
        return {
          success: false,
          content: `Unknown operation: ${op}`,
          error: { code: 'INVALID_OPERATION', message: `Operation ${op} is not supported` },
        };
    }

    return {
      success: true,
      content: `${a} ${op} ${b} = ${result}`,
      data: { result },
    };
  },
};
```
</details>

---

## 练习 2：理解 AgenticLoop 流程

### 题目
假设用户发送消息："帮我查询 Boss 统计数据"

Agent 有以下工具可用：
- `boss_get_stats`: 获取 Boss 统计
- `boss_create_spawn_point`: 创建刷怪点

请回答：

1. AgenticLoop 第一次迭代时，发送给 LLM 的消息是什么？
2. LLM 返回的 toolCalls 可能是什么？
3. 工具执行后，第二次迭代发送给 LLM 的消息是什么？
4. 循环什么时候结束？

### 参考答案
<details>
<summary>点击查看答案</summary>

1. **第一次迭代发送给 LLM 的消息：**
```json
[
  { "role": "system", "content": "You are a helpful AI assistant..." },
  { "role": "user", "content": "帮我查询 Boss 统计数据" }
]
```

2. **LLM 返回的 toolCalls：**
```json
{
  "content": "",
  "toolCalls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "boss_get_stats",
        "arguments": "{\"include_kill_history\": false}"
      }
    }
  ]
}
```

3. **第二次迭代发送给 LLM 的消息：**
```json
[
  { "role": "system", "content": "You are a helpful AI assistant..." },
  { "role": "user", "content": "帮我查询 Boss 统计数据" },
  { "role": "assistant", "content": "", "toolCalls": [...] },
  { "role": "tool", "toolCallId": "call_123", "content": "{\"success\": true, \"content\": \"Boss统计: 总刷怪点 15 个...\"}" }
]
```

4. **循环结束条件：**
当 LLM 返回的响应中没有 toolCalls 时，循环结束。LLM 会生成最终的文本回复，如：
```json
{
  "content": "Boss 统计数据如下：\n- 总刷怪点：15 个\n- 已启用：12 个\n- 今日击杀：5 次",
  "toolCalls": undefined
}
```
</details>

---

## 练习 3：理解混合搜索

### 题目
假设知识库中有以下文档：
- Doc A: "火焰Boss配置指南" (关键词匹配度高)
- Doc B: "Boss刷怪点设置教程" (语义相似度高)
- Doc C: "MythicMobs技能系统" (两者都一般)

用户查询："如何创建火焰Boss"

关键词搜索结果：
- Doc A: 0.9
- Doc C: 0.4
- Doc B: 0.3

语义搜索结果：
- Doc B: 0.85
- Doc A: 0.6
- Doc C: 0.5

混合搜索权重：关键词 30%，语义 70%

请计算最终排序。

### 参考答案
<details>
<summary>点击查看答案</summary>

**计算公式：** `finalScore = keywordScore * 0.3 + semanticScore * 0.7`

- Doc A: 0.9 * 0.3 + 0.6 * 0.7 = 0.27 + 0.42 = **0.69**
- Doc B: 0.3 * 0.3 + 0.85 * 0.7 = 0.09 + 0.595 = **0.685**
- Doc C: 0.4 * 0.3 + 0.5 * 0.7 = 0.12 + 0.35 = **0.47**

**最终排序：**
1. Doc A: 0.69
2. Doc B: 0.685
3. Doc C: 0.47

**分析：**
- Doc A 因为关键词匹配度很高 (0.9)，即使语义分数一般，最终仍然排第一
- Doc B 语义分数很高，但关键词分数低，最终排第二
- 混合搜索平衡了两种方法的优缺点
</details>

---

## 练习 4：创建插件

### 题目
创建一个 "weather" 插件，包含以下工具：
- `get_weather`: 获取指定城市的天气
- `get_forecast`: 获取未来几天的天气预报

要求：
1. 使用工厂函数模式
2. 支持依赖注入
3. 添加命名空间

### 参考答案
<details>
<summary>点击查看答案</summary>

```typescript
import type { Tool, ToolResult, ToolContext, AgentPlugin, PluginFactory, PluginContext } from '@ai-agent/core';

// 1. 定义服务接口
interface WeatherService {
  getCurrentWeather(city: string): Promise<{
    temperature: number;
    condition: string;
    humidity: number;
  }>;
  getForecast(city: string, days: number): Promise<Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
  }>>;
}

// 2. 创建工具工厂函数
function createGetWeatherTool(service?: WeatherService): Tool {
  return {
    name: 'get_weather',
    description: 'Get current weather for a city',
    parameters: [
      {
        name: 'city',
        type: 'string',
        description: 'City name',
        required: true,
      },
    ],
    riskLevel: 'low',
    execute: async (args, context): Promise<ToolResult> => {
      const city = args.city as string;
      
      if (!service) {
        return {
          success: false,
          content: 'Weather service not available',
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Weather service not configured' },
        };
      }

      try {
        const weather = await service.getCurrentWeather(city);
        return {
          success: true,
          content: `Weather in ${city}: ${weather.temperature}°C, ${weather.condition}, Humidity: ${weather.humidity}%`,
          data: weather,
        };
      } catch (error) {
        return {
          success: false,
          content: `Failed to get weather: ${error}`,
          error: { code: 'FETCH_ERROR', message: String(error) },
        };
      }
    },
  };
}

function createGetForecastTool(service?: WeatherService): Tool {
  return {
    name: 'get_forecast',
    description: 'Get weather forecast for a city',
    parameters: [
      {
        name: 'city',
        type: 'string',
        description: 'City name',
        required: true,
      },
      {
        name: 'days',
        type: 'number',
        description: 'Number of days (1-7)',
        required: false,
        default: 3,
      },
    ],
    riskLevel: 'low',
    execute: async (args, context): Promise<ToolResult> => {
      const city = args.city as string;
      const days = (args.days as number) || 3;

      if (!service) {
        return {
          success: false,
          content: 'Weather service not available',
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Weather service not configured' },
        };
      }

      try {
        const forecast = await service.getForecast(city, days);
        const lines = forecast.map(f => `${f.date}: ${f.low}°C - ${f.high}°C, ${f.condition}`);
        return {
          success: true,
          content: `${days}-day forecast for ${city}:\n${lines.join('\n')}`,
          data: forecast,
        };
      } catch (error) {
        return {
          success: false,
          content: `Failed to get forecast: ${error}`,
          error: { code: 'FETCH_ERROR', message: String(error) },
        };
      }
    },
  };
}

// 3. 定义插件依赖
interface WeatherPluginDeps {
  weatherService?: WeatherService;
}

// 4. 创建插件工厂
export const createWeatherPlugin: PluginFactory<WeatherPluginDeps> = (deps): AgentPlugin => {
  return {
    name: 'weather',
    version: '1.0.0',
    description: 'Weather information tools',
    namespace: 'weather',  // 工具名会变成 weather_get_weather, weather_get_forecast
    tools: [
      createGetWeatherTool(deps.weatherService),
      createGetForecastTool(deps.weatherService),
    ],
    async onLoad(context: PluginContext) {
      context.logger.info('Weather plugin loaded');
    },
    async onUnload() {
      // cleanup
    },
  };
};

// 5. 使用示例
/*
const weatherPlugin = createWeatherPlugin({
  weatherService: myWeatherService,
});

await agent.loadPlugin(weatherPlugin);
*/
```
</details>

---

## 练习 5：追踪完整请求

### 题目
用户发送："删除 ID 为 sp_001 的刷怪点"

假设：
- Agent 配置了 `requireConfirmation: true`
- `boss_delete_spawn_point` 工具的 `riskLevel: 'high'`

请描述完整的处理流程，包括：
1. 第一次 chat() 调用返回什么？
2. 用户确认后，第二次 chat() 调用做了什么？
3. 最终返回什么？

### 参考答案
<details>
<summary>点击查看答案</summary>

**第一次 chat() 调用：**

1. Agent 接收消息："删除 ID 为 sp_001 的刷怪点"
2. 执行 RAG 检索，获取相关知识
3. 调用 `checkConfirmationNeeded()`：
   - LLM 预测会调用 `boss_delete_spawn_point`
   - 该工具 `riskLevel: 'high'`
   - 需要确认
4. 返回 `ConfirmResponse`：

```typescript
{
  type: 'confirm',
  message: '即将执行操作: boss_delete_spawn_point，请确认是否继续？',
  action: {
    type: 'boss_delete_spawn_point',
    target: 'sp_001',
    params: { id: 'sp_001' }
  },
  risk: 'high',
  preview: '工具: boss_delete_spawn_point\n参数: {"id": "sp_001"}',
  pendingConfirmation: {
    toolName: 'boss_delete_spawn_point',
    arguments: { id: 'sp_001' },
    userMessage: '删除 ID 为 sp_001 的刷怪点',
    timestamp: new Date()
  }
}
```

**用户确认后，第二次 chat() 调用：**

1. 用户发送："是" 或 "确认"
2. Agent 检测到 `options.pendingConfirmation` 存在
3. 调用 `handleConfirmationResponse()`：
   - 检测到用户确认
   - 重新调用 `chat()` 并设置 `skipConfirmation: true`
4. AgenticLoop 执行：
   - 迭代 1: LLM 决定调用 `boss_delete_spawn_point`
   - 工具执行删除操作
   - 迭代 2: LLM 生成最终回复
5. 返回 `ExecuteResponse`：

```typescript
{
  type: 'execute',
  message: '已成功删除刷怪点 sp_001',
  data: { deleted: true, id: 'sp_001' },
  toolCalls: [
    {
      toolName: 'boss_delete_spawn_point',
      arguments: { id: 'sp_001' },
      result: {
        success: true,
        content: 'Spawn point sp_001 deleted successfully',
        data: { id: 'sp_001' }
      }
    }
  ]
}
```

**流程图：**
```
用户: "删除 ID 为 sp_001 的刷怪点"
           ↓
    checkConfirmationNeeded()
           ↓
    返回 ConfirmResponse (等待确认)
           ↓
用户: "是"
           ↓
    handleConfirmationResponse()
           ↓
    chat(原消息, { skipConfirmation: true })
           ↓
    AgenticLoop 执行工具
           ↓
    返回 ExecuteResponse
```
</details>

---

## 练习 6：调试问题

### 题目
用户报告："AI 助手总是说找不到工具"

错误信息：`Tool not found: get_boss_stats`

可能的原因有哪些？如何排查？

### 参考答案
<details>
<summary>点击查看答案</summary>

**可能原因：**

1. **插件未加载**
   - 检查 `agent.loadPlugin()` 是否被调用
   - 检查是否有加载错误

2. **命名空间问题**
   - 如果插件有 `namespace: 'boss'`，工具名会变成 `boss_get_boss_stats`
   - LLM 可能调用了错误的名称

3. **工具名拼写错误**
   - 检查工具定义中的 `name` 字段

4. **插件加载顺序**
   - 确保在 `chat()` 之前加载插件

**排查步骤：**

```typescript
// 1. 检查已加载的插件
const plugins = agent.listPlugins();
console.log('Loaded plugins:', plugins);

// 2. 检查已注册的工具
const pluginManager = agent.getPluginManager();
const tools = pluginManager.listToolNames();
console.log('Registered tools:', tools);

// 3. 检查特定工具是否存在
const tool = pluginManager.getTool('boss_get_boss_stats');
console.log('Tool found:', !!tool);

// 4. 检查插件加载日志
// 在 plugin.onLoad 中添加日志
async onLoad(context) {
  context.logger.info('Boss plugin loaded', {
    toolCount: this.tools.length,
    toolNames: this.tools.map(t => t.name),
  });
}
```

**常见修复：**

```typescript
// 确保正确加载插件
const bossPlugin = createBossPlugin({
  bossDataService: myService,
});

await agent.loadPlugin(bossPlugin);

// 验证加载成功
if (!agent.hasPlugin('boss')) {
  throw new Error('Boss plugin failed to load');
}
```
</details>

---

完成这些练习后，你应该对整个系统有了深入的理解！
