# AI Agent 架构图 - Day 1: 类型系统与核心循环

> 📅 学习日期: Day 1
> 📚 涵盖文件: `tool.ts`, `response.ts`, `config.ts`, `agentic-loop.ts`

---

## 1. 整体架构概览

```mermaid
graph TB
    subgraph "用户层"
        User[👤 用户]
    end
    
    subgraph "Agent 核心"
        Agent[🤖 Agent]
        Loop[🔄 AgenticLoop<br/>ReAct 循环]
        PluginMgr[🔌 PluginManager]
    end
    
    subgraph "LLM 层"
        LLMMgr[📡 LLMManager]
        OpenAI[OpenAI Adapter]
        Claude[Claude Adapter]
        Qwen[Qwen Adapter]
    end
    
    subgraph "工具层"
        Tools[🛠️ Tools]
        BossTools[Boss 工具]
        MythicTools[MythicMobs 工具]
    end
    
    subgraph "知识层"
        Knowledge[📚 Knowledge Store]
        Retriever[🔍 Retriever]
    end
    
    User -->|chat| Agent
    Agent -->|run| Loop
    Loop -->|getTools| PluginMgr
    Loop -->|generate| LLMMgr
    LLMMgr --> OpenAI
    LLMMgr --> Claude
    LLMMgr --> Qwen
    PluginMgr --> Tools
    Tools --> BossTools
    Tools --> MythicTools
    Agent -->|search| Knowledge
    Knowledge --> Retriever
    
    style Agent fill:#4CAF50,color:#fff
    style Loop fill:#2196F3,color:#fff
    style LLMMgr fill:#FF9800,color:#fff
    style Tools fill:#9C27B0,color:#fff
    style Knowledge fill:#00BCD4,color:#fff
```

---

## 2. Tool 类型系统 (tool.ts)

```mermaid
graph LR
    subgraph "内部格式"
        Tool[Tool Interface]
        Tool --> |name| T1[string]
        Tool --> |description| T2[string]
        Tool --> |parameters| T3["ToolParameter[]"]
        Tool --> |execute| T4["(args, ctx) => ToolResult"]
        Tool --> |riskLevel?| T5["'low' | 'medium' | 'high'"]
    end
    
    subgraph "转换"
        Convert[toolToDefinition<br/>转换函数]
    end
    
    subgraph "OpenAI 格式"
        ToolDef[ToolDefinition]
        ToolDef --> |type| D1["'function'"]
        ToolDef --> |function.name| D2[string]
        ToolDef --> |function.description| D3[string]
        ToolDef --> |function.parameters| D4[JSON Schema]
    end
    
    Tool ==>|转换| Convert
    Convert ==>|输出| ToolDef
    
    style Tool fill:#FFF3E0,stroke:#FF9800
    style Convert fill:#E1BEE7,stroke:#9C27B0
    style ToolDef fill:#C8E6C9,stroke:#4CAF50
```

### ToolResult 结构

```mermaid
graph TB
    ToolResult[ToolResult]
    ToolResult --> Success[success: boolean]
    ToolResult --> Content[content: string]
    ToolResult --> Data[data?: unknown]
    ToolResult --> Error[error?: ToolError]
    
    Error --> Code[code: string]
    Error --> Message[message: string]
    
    style ToolResult fill:#BBDEFB,stroke:#2196F3
```

---

## 3. Response 类型系统 (response.ts)

```mermaid
graph TB
    subgraph "AgentResponse 联合类型"
        direction TB
        
        Execute[✅ ExecuteResponse<br/>执行完成]
        Clarify[❓ ClarifyResponse<br/>需要澄清]
        Confirm[⚠️ ConfirmResponse<br/>需要确认]
        Knowledge[📚 KnowledgeRequestResponse<br/>缺少知识]
        Options[📋 OptionsResponse<br/>提供选项]
    end
    
    Execute --> E1["message: string"]
    Execute --> E2["data?: unknown"]
    Execute --> E3["toolCalls?: ToolCallRecord[]"]
    
    Clarify --> C1["message: string"]
    Clarify --> C2["questions: string[]"]
    
    Confirm --> CF1["message: string"]
    Confirm --> CF2["action: {type, target, params}"]
    Confirm --> CF3["risk: 'low'|'medium'|'high'"]
    Confirm --> CF4["preview?: string"]
    
    Knowledge --> K1["message: string"]
    Knowledge --> K2["missing: {topic, description}"]
    Knowledge --> K3["options: KnowledgeOption[]"]
    
    Options --> O1["message: string"]
    Options --> O2["options: SelectableOption[]"]
    
    style Execute fill:#C8E6C9,stroke:#4CAF50
    style Clarify fill:#FFF9C4,stroke:#FFC107
    style Confirm fill:#FFCDD2,stroke:#F44336
    style Knowledge fill:#E1BEE7,stroke:#9C27B0
    style Options fill:#BBDEFB,stroke:#2196F3
```

### 场景示例

| 响应类型 | 触发场景 | 示例 |
|---------|---------|------|
| `execute` | 任务完成 | "已成功创建 Boss 刷新点" |
| `clarify` | 意图不明确 | "你要删除哪个 Boss？" |
| `confirm` | 高风险操作 | "确定要删除 FireDragon 吗？" |
| `knowledge_request` | 缺少信息 | "我不知道配置文件在哪里" |
| `options` | 多个选择 | "找到 3 个匹配的 Boss，请选择" |

---

## 4. Config 配置系统 (config.ts)

```mermaid
graph TB
    subgraph "LLM 配置模式"
        Single[单 LLM 模式<br/>mode: 'single']
        Multi[多 LLM 模式<br/>mode: 'multi']
    end
    
    subgraph "单模式"
        S1[所有任务<br/>↓<br/>同一个 LLM]
    end
    
    subgraph "多模式 - 任务路由"
        M1[intent_parsing<br/>意图解析]
        M2[knowledge_retrieval<br/>知识检索]
        M3[tool_calling<br/>工具调用]
        M4[response_generation<br/>生成回复]
        
        M1 --> GPT35[GPT-3.5<br/>便宜快速]
        M2 --> Qwen[Qwen<br/>国产便宜]
        M3 --> GPT4[GPT-4<br/>工具调用强]
        M4 --> Claude[Claude<br/>文字优美]
    end
    
    Single --> S1
    Multi --> M1
    Multi --> M2
    Multi --> M3
    Multi --> M4
    
    style Single fill:#BBDEFB,stroke:#2196F3
    style Multi fill:#C8E6C9,stroke:#4CAF50
    style GPT4 fill:#FFF3E0,stroke:#FF9800
```

### 容错机制

```mermaid
graph LR
    Primary[主 LLM] -->|失败| Retry[重试机制<br/>maxRetries: 3]
    Retry -->|仍失败| Fallback[Fallback LLM]
    Fallback -->|成功| Result[返回结果]
    
    style Primary fill:#4CAF50,color:#fff
    style Retry fill:#FF9800,color:#fff
    style Fallback fill:#F44336,color:#fff
```

---

## 5. AgenticLoop 执行循环 (agentic-loop.ts)

### ReAct 模式

```mermaid
graph LR
    Reason[🧠 思考<br/>Reason] --> Act[⚡ 行动<br/>Act]
    Act --> Observe[👁️ 观察<br/>Observe]
    Observe --> Reason
    
    style Reason fill:#E3F2FD,stroke:#2196F3
    style Act fill:#FFF3E0,stroke:#FF9800
    style Observe fill:#E8F5E9,stroke:#4CAF50
```

### 完整执行流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant L as AgenticLoop
    participant LLM as LLM
    participant T as Tools
    
    U->>L: "查询 Boss 统计"
    
    Note over L: 初始化 messages<br/>[system, user]
    
    rect rgb(230, 245, 255)
        Note over L,T: 迭代 1
        L->>LLM: messages + toolDefinitions
        LLM-->>L: toolCalls: [get_boss_stats]
        L->>T: execute(get_boss_stats, {})
        T-->>L: {success: true, content: "统计数据..."}
        Note over L: messages += [assistant, tool]
    end
    
    rect rgb(232, 245, 233)
        Note over L,T: 迭代 2
        L->>LLM: messages (包含工具结果)
        LLM-->>L: content: "根据查询结果..."<br/>toolCalls: undefined
        Note over L: status = 'completed'
    end
    
    L-->>U: LoopResult
```

### Messages 状态变化

```mermaid
graph TB
    subgraph "初始状态"
        I1["[0] system: 你是游戏管理助手..."]
        I2["[1] user: 查询 Boss 统计"]
    end
    
    subgraph "迭代 1 后"
        A1["[0] system: ..."]
        A2["[1] user: ..."]
        A3["[2] assistant: {toolCalls: [...]}"]
        A4["[3] tool: {统计数据...}"]
    end
    
    subgraph "迭代 2 后 (完成)"
        B1["[0] system: ..."]
        B2["[1] user: ..."]
        B3["[2] assistant: {toolCalls}"]
        B4["[3] tool: {结果}"]
        B5["[4] assistant: 根据查询结果..."]
    end
    
    I1 --> A1
    I2 --> A2
    A3 -.->|新增| A3
    A4 -.->|新增| A4
    
    style A3 fill:#FFF3E0,stroke:#FF9800
    style A4 fill:#E8F5E9,stroke:#4CAF50
    style B5 fill:#C8E6C9,stroke:#4CAF50
```

### 循环终止条件

```mermaid
graph TB
    Running[status: running]
    
    Running -->|LLM 无 toolCalls| Completed[✅ completed<br/>任务完成]
    Running -->|超过 maxIterations| MaxIter[⚠️ max_iterations<br/>达到上限]
    Running -->|abortSignal| Cancelled[🚫 cancelled<br/>用户取消]
    Running -->|异常| Error[❌ error<br/>执行错误]
    
    style Completed fill:#C8E6C9,stroke:#4CAF50
    style MaxIter fill:#FFF9C4,stroke:#FFC107
    style Cancelled fill:#FFCDD2,stroke:#F44336
    style Error fill:#FFCDD2,stroke:#F44336
```

### 工具调用失败处理

```mermaid
graph TB
    ToolCall[工具调用]
    ToolCall -->|执行| Result{结果}
    
    Result -->|success: true| Success[成功结果]
    Result -->|success: false| Failure[失败结果]
    
    Success --> AddMsg1[添加到 messages]
    Failure --> AddMsg2[添加到 messages<br/>包含错误信息]
    
    AddMsg1 --> NextIter[继续下一迭代]
    AddMsg2 --> NextIter
    
    NextIter --> LLMDecide[LLM 看到结果<br/>自主决定下一步]
    
    LLMDecide -->|重试| Retry[调用其他工具]
    LLMDecide -->|放弃| GiveUp[告诉用户失败原因]
    LLMDecide -->|询问| Ask[询问用户更多信息]
    
    style Failure fill:#FFCDD2,stroke:#F44336
    style LLMDecide fill:#E3F2FD,stroke:#2196F3
```

---

## 6. Day 1 知识点总结

### 核心概念

| 概念 | 文件 | 说明 |
|-----|------|------|
| Tool | `tool.ts` | 内部工具格式，包含 execute 函数 |
| ToolDefinition | `tool.ts` | OpenAI Function Calling 格式 |
| AgentResponse | `response.ts` | 5 种响应类型的联合类型 |
| LLMConfig | `config.ts` | 单/多 LLM 模式配置 |
| AgenticLoop | `agentic-loop.ts` | ReAct 执行循环 |

### 关键问题回答

1. **上下文如何维护？** → `state.messages` 数组累积所有消息
2. **怎么知道 LLM 想调用工具？** → 检查 `llmResponse.toolCalls`
3. **循环什么时候结束？** → LLM 不返回 `toolCalls` 时
4. **工具失败怎么办？** → 结果加入 messages，让 LLM 决定下一步

---

## 📖 如何查看这些图表

1. **VS Code**: 安装 "Markdown Preview Mermaid Support" 插件
2. **在线**: 复制 Mermaid 代码到 [mermaid.live](https://mermaid.live)
3. **导出**: 使用 mermaid-cli 导出为 PNG/SVG

```bash
# 安装 mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# 导出为 PNG
mmdc -i ARCHITECTURE-DAY1.md -o architecture.png
```
