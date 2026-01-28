# Day 6: 业务工具实现 (agent-tools)

## 学习目标
- 理解工具的具体实现
- 掌握插件工厂模式
- 理解依赖注入方式
- 学会创建新工具

---

## 1. agent-tools 模块概述

### 1.1 模块职责

**agent-tools** 是业务工具的实现层，包含：
- ✅ **Boss 管理工具** - 刷怪点的增删改查
- ✅ **MythicMobs 工具** - 配置文件的读写和管理
- ✅ **知识文档** - RAG 系统使用的领域知识

### 1.2 与 agent 模块的关系

```
agent (通用框架)
  ↓ 提供基础设施
agent-tools (业务实现)
  ↓ 使用框架
具体应用 (XianCore Dashboard)
```

**关注点分离：**
- `agent` 可以被其他项目复用
- `agent-tools` 是 XianCore 特定的业务逻辑

---

## 2. 插件工厂模式

### 2.1 为什么用工厂函数？

❌ **直接导出工具的问题：**
```typescript
// 问题：硬编码依赖，无法测试
export const getBossStatsTool: Tool = {
  name: 'get_boss_stats',
  execute: async (args, context) => {
    // 直接访问数据库？
    const stats = await db.query('SELECT ...');
    return { success: true, data: stats };
  },
};
```

✅ **工厂函数的优势：**
```typescript
// 优势：依赖注入，可测试
export function createGetBossStatsTool(
  bossDataService?: BossDataService
): Tool {
  return {
    name: 'get_boss_stats',
    execute: async (args, context) => {
      // 使用注入的服务
      const service = bossDataService ?? context.bossService;
      const stats = await service.getStats();
      return { success: true, data: stats };
    },
  };
}
```


### 2.2 工厂模式的三层结构

```
1. 服务接口定义
   ↓
2. 工具工厂函数 (createXxxTool)
   ↓
3. 插件工厂函数 (createXxxPlugin)
```

---

## 3. Boss 工具实现

### 3.1 服务接口定义

```typescript
// 定义服务接口（不依赖具体实现）
export interface BossDataService {
  getStats(): Promise<BossStats>;
  getKillHistory(options?: {...}): Promise<{...}>;
}

export interface SpawnPointService {
  createSpawnPoint(data: CreateSpawnPointInput): Promise<unknown>;
  getSpawnPointById(id: string): Promise<unknown | null>;
  updateSpawnPoint(id: string, data: Partial<...>): Promise<unknown>;
  // ...
}
```

**关键点：**
- ✅ 接口定义在 tools 层
- ✅ 具体实现在应用层（Dashboard）
- ✅ 工具通过接口调用服务，不关心实现

### 3.2 get_boss_stats 工具

**功能：** 查询 Boss 统计信息

**参数：**
- `include_kill_history` (boolean, 可选) - 是否包含击杀历史
- `kill_history_limit` (number, 可选) - 历史记录数量限制

**实现流程：**
```typescript
function createExecuteFunction(injectedService?: BossDataService) {
  return async (args, context) => {
    // 1. 解析参数
    const includeKillHistory = args.include_kill_history ?? false;
    const killHistoryLimit = args.kill_history_limit ?? 10;
    
    // 2. 获取服务（注入优先，回退到 context）
    const service = injectedService ?? context.bossService;
    
    if (!service) {
      return { success: false, error: 'SERVICE_UNAVAILABLE' };
    }
    
    // 3. 调用服务
    const stats = await service.getStats();
    
    // 4. 可选：获取击杀历史
    if (includeKillHistory) {
      const killHistory = await service.getKillHistory({
        limit: killHistoryLimit,
      });
      // ...
    }
    
    // 5. 格式化返回
    return {
      success: true,
      content: '格式化的文本...',
      data: { stats, killHistory },
    };
  };
}
```

**风险等级：** `low` - 只读操作，无副作用

### 3.3 create_spawn_point 工具

**功能：** 创建新的 Boss 刷怪点

**参数：** 17 个参数（id, name, world, x, y, z, mythic_mob_id, ...）

**实现流程：**
```typescript
function createExecuteFunction(injectedService?: SpawnPointService) {
  return async (args, context) => {
    // 1. 参数映射（snake_case → camelCase）
    const input: CreateSpawnPointInput = {
      id: args.id,
      name: args.name,
      mythicMobId: args.mythic_mob_id,  // 注意转换
      // ...
    };
    
    // 2. 参数验证
    const validation = validateInput(input);
    if (!validation.valid) {
      return {
        success: false,
        content: `Validation failed:\n${validation.errors.join('\n')}`,
        error: { code: 'VALIDATION_ERROR', details: validation.errors },
      };
    }
    
    // 3. 检查重复
    const existing = await service.getSpawnPointById(input.id);
    if (existing) {
      return {
        success: false,
        error: { code: 'DUPLICATE_ID' },
      };
    }
    
    // 4. 创建刷怪点
    const created = await service.createSpawnPoint(input);
    
    // 5. 返回结果
    return {
      success: true,
      content: '成功创建刷怪点...',
      data: created,
    };
  };
}
```

**风险等级：** `medium` - 写操作，需要确认

**requiresConfirmation：** `true` - 触发确认机制

### 3.4 参数验证逻辑

```typescript
function validateInput(input: CreateSpawnPointInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 必填字段
  if (!input.id || input.id.trim() === '') {
    errors.push('id is required and must be a non-empty string');
  }
  if (!input.name || input.name.trim() === '') {
    errors.push('name is required and must be a non-empty string');
  }
  if (typeof input.x !== 'number' || isNaN(input.x)) {
    errors.push('x coordinate is required and must be a number');
  }
  
  // 可选字段验证
  if (input.tier !== undefined && (input.tier < 1 || input.tier > 10)) {
    errors.push('tier must be a number between 1 and 10');
  }
  
  return { valid: errors.length === 0, errors };
}
```

**验证规则：**
- ✅ 必填字段检查
- ✅ 类型检查
- ✅ 范围检查
- ✅ 返回所有错误（不是遇到第一个就停止）


---

## 4. MythicMobs 工具实现

### 4.1 文件系统抽象

**为什么需要抽象？**
- ✅ 测试时可以 mock 文件系统
- ✅ 支持不同的存储后端（本地文件、云存储等）
- ✅ 统一错误处理

```typescript
export interface FileSystemService {
  readdir(path: string): Promise<string[]>;
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, content: string, encoding: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  exists?(path: string): Promise<boolean>;
}

// 默认实现（使用 Node.js fs）
export const defaultFileSystemService: FileSystemService = {
  readdir: (dirPath) => fs.readdir(dirPath),
  readFile: (filePath, encoding) => fs.readFile(filePath, encoding),
  writeFile: (filePath, content, encoding) => fs.writeFile(filePath, content, encoding),
  mkdir: (dirPath, options) => fs.mkdir(dirPath, options).then(() => {}),
  exists: async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },
};
```

### 4.2 read_mob_config 工具

**功能：** 读取 MythicMobs 配置文件

**实现流程：**
```typescript
async function findMobFile(
  mobName: string,
  mobsDirectory: string,
  fileSystem: FileSystemService
): Promise<{ filePath: string; content: Record<string, unknown> } | null> {
  const normalizedName = mobName.toLowerCase();
  
  // 1. 递归获取所有 YAML 文件
  const yamlFiles = await getAllYamlFilesRecursive(mobsDirectory, fileSystem);
  
  // 2. 遍历每个文件
  for (const filePath of yamlFiles) {
    try {
      // 3. 读取并解析 YAML
      const content = await fileSystem.readFile(filePath, 'utf-8');
      const parsed = yaml.load(content);
      
      // 4. 检查是否包含目标 mob
      for (const key of Object.keys(parsed)) {
        if (key.toLowerCase() === normalizedName) {
          return { filePath, content: { [key]: parsed[key] } };
        }
      }
    } catch {
      // 跳过无法解析的文件
      continue;
    }
  }
  
  return null;
}
```

**关键特性：**
- ✅ 递归搜索子目录
- ✅ 大小写不敏感
- ✅ 容错处理（跳过损坏的文件）
- ✅ 返回文件路径和内容

### 4.3 save_mob_config 工具

**功能：** 保存 MythicMobs 配置文件

**审计日志：**
```typescript
export interface MythicMobsAuditLogger {
  log(entry: {
    operationType: string;
    target: string;
    params: Record<string, unknown>;
    result: Record<string, unknown>;
    status: string;
    sessionId?: string;
  }): Promise<void>;
}

// 在工具中使用
if (auditLogger) {
  await auditLogger.log({
    operationType: 'save_mob_config',
    target: mobName,
    params: { mobName, filePath },
    result: { success: true },
    status: 'success',
    sessionId: context.sessionId,
  });
}
```

**风险等级：** `high` - 修改配置文件，需要确认

---

## 5. 插件工厂实现

### 5.1 createBossPlugin

```typescript
export const createBossPlugin: PluginFactory<BossPluginDeps> = (
  deps: BossPluginDeps
): AgentPlugin => {
  // 1. 创建工具（注入依赖）
  const tools: Tool[] = [
    createGetBossStatsTool(deps.bossDataService),
    createCreateSpawnPointTool(deps.spawnPointService),
    createUpdateSpawnPointTool(deps.spawnPointService, deps.auditLogger),
    createBatchToggleSpawnPointsTool(deps.spawnPointService, deps.auditLogger),
    createQuerySpawnPointsTool(deps.spawnPointService),
  ];
  
  // 2. 返回插件对象
  return {
    name: 'boss',
    version: '1.0.0',
    description: 'Boss spawn point management tools',
    namespace: 'boss',
    tools,
    
    async onLoad(context: PluginContext) {
      // 3. 向后兼容：存储到 context.services
      if (deps.bossDataService) {
        context.services.bossService = deps.bossDataService;
      }
      if (deps.spawnPointService) {
        context.services.spawnPointService = deps.spawnPointService;
      }
      
      context.logger.info('Boss plugin loaded', {
        toolCount: tools.length,
      });
    },
    
    async onUnload() {
      // 清理资源
    },
    
    async healthCheck() {
      // 健康检查
      return !!(deps.bossDataService || deps.spawnPointService);
    },
  };
};
```

### 5.2 使用插件

```typescript
// 在应用层（Dashboard）
const bossPlugin = createBossPlugin({
  bossDataService: {
    getStats: async () => {
      // 实际的数据库查询
      return await db.query('SELECT ...');
    },
    getKillHistory: async (options) => {
      // ...
    },
  },
  spawnPointService: {
    createSpawnPoint: async (data) => {
      // ...
    },
    // ...
  },
  auditLogger: {
    log: async (entry) => {
      await db.insert('audit_log', entry);
    },
  },
});

agent.loadPlugin(bossPlugin);
```

---

## 6. 关键设计模式

### 6.1 依赖注入

**优势：**
- ✅ 解耦：工具不依赖具体实现
- ✅ 可测试：可以注入 mock 服务
- ✅ 灵活：可以替换不同的实现

**实现方式：**
```typescript
// 通过闭包捕获注入的依赖
function createExecuteFunction(injectedService?: Service) {
  return async (args, context) => {
    const service = injectedService ?? context.service;
    // 使用 service
  };
}
```

### 6.2 工厂模式

**三层工厂：**
1. **createXxxTool** - 创建单个工具
2. **createXxxPlugin** - 创建插件（包含多个工具）
3. **Agent.loadPlugin** - 加载插件到 Agent

### 6.3 接口隔离

**原则：** 工具只依赖它需要的接口

```typescript
// ✅ 好：接口最小化
interface BossDataService {
  getStats(): Promise<BossStats>;
}

// ❌ 坏：接口过大
interface BossService {
  getStats(): Promise<BossStats>;
  createSpawnPoint(data: any): Promise<any>;
  updateSpawnPoint(id: string, data: any): Promise<any>;
  deleteSpawnPoint(id: string): Promise<void>;
  // ... 太多方法
}
```

---

## 7. 风险等级和确认机制

### 7.1 风险等级定义

```typescript
type RiskLevel = 'low' | 'medium' | 'high';
```

**分类标准：**
- **low** - 只读操作，无副作用
  - 例：`get_boss_stats`, `read_mob_config`
- **medium** - 写操作，可恢复
  - 例：`create_spawn_point`, `update_spawn_point`
- **high** - 危险操作，难以恢复
  - 例：`save_mob_config`, `batch_toggle_spawn_points`

### 7.2 确认机制

**触发条件：**
```typescript
{
  riskLevel: 'medium' | 'high',
  requiresConfirmation: true,
}
```

**流程：**
```
LLM 决定调用工具
  ↓
Agent 检查 requiresConfirmation
  ↓
返回 confirm 响应（不执行）
  ↓
前端显示确认对话框
  ↓
用户确认
  ↓
再次调用 Agent.chat (skipConfirmation: true)
  ↓
执行工具
```

---

## 8. 参数命名约定

### 8.1 snake_case vs camelCase

**LLM 侧（工具定义）：** `snake_case`
```typescript
{
  name: 'mythic_mob_id',
  type: 'string',
  description: '...',
}
```

**TypeScript 侧（内部实现）：** `camelCase`
```typescript
interface CreateSpawnPointInput {
  mythicMobId: string;
}
```

**转换：**
```typescript
const input: CreateSpawnPointInput = {
  mythicMobId: args.mythic_mob_id as string,
};
```

**原因：**
- LLM 更习惯 snake_case（Python 风格）
- TypeScript 约定使用 camelCase

---

## 9. 错误处理

### 9.1 错误码设计

```typescript
// 统一的错误码
type ErrorCode =
  | 'SERVICE_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_ID'
  | 'NOT_FOUND'
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'PERMISSION_DENIED';
```

### 9.2 错误返回格式

```typescript
return {
  success: false,
  content: '用户友好的错误消息',
  error: {
    code: 'VALIDATION_ERROR',
    message: '技术性错误消息',
    details: ['具体错误1', '具体错误2'],  // 可选
  },
};
```

**关键点：**
- `content` - LLM 会看到，应该友好
- `error.message` - 技术细节，用于调试
- `error.details` - 额外信息（如验证错误列表）

---

## 10. 总结

### 10.1 核心概念

✅ **插件工厂模式** - 通过工厂函数创建插件
✅ **依赖注入** - 通过参数注入服务，不硬编码
✅ **接口隔离** - 工具只依赖需要的接口
✅ **参数验证** - 在工具层验证，返回详细错误
✅ **风险等级** - 根据操作危险性分级
✅ **确认机制** - 高风险操作需要用户确认
✅ **审计日志** - 记录所有写操作

### 10.2 最佳实践

1. **使用工厂函数** - 不要直接导出工具
2. **定义服务接口** - 在 tools 层定义，应用层实现
3. **参数验证** - 返回所有错误，不要遇到第一个就停止
4. **错误处理** - 使用统一的错误码和格式
5. **日志记录** - 记录关键操作和错误
6. **向后兼容** - 支持 context-based 和 injection-based 两种方式

---

Day 6 学习完成！你现在已经完全理解了业务工具的实现方式。
