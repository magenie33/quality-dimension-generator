# Quality Dimension Generator MCP Server

一个基于 Model Context Protocol (MCP) 的智能质量维度生成器，专注于为任务评价提供专业、可配置的质量评价维度。

## � 核心理念

**专注维度生成，简化质量评价**
- ✅ **智能维度生成** - 根据任务特点生成专业的评价维度
- ✅ **可配置参数** - 支持自定义维度数量和期望分数
- ✅ **6-8-10评分指导** - 6分及格、8分优秀、10分卓越的三层指导体系
- ✅ **灵活评分范围** - 实际评分支持完整的0-10分制
- ✅ **Markdown输出** - 人类友好的格式化输出

## 🌟 功能特性

### 核心功能
- **任务分析** - 从用户对话中智能提取核心任务
- **维度生成** - 基于任务特点生成专业评价维度
- **时间感知** - 结合当前时间上下文生成相关维度
- **配置管理** - 支持项目级配置，自动管理.qdg目录结构

### 配置特性
- **维度数量** - 可配置1-10个维度（默认5个）
- **期望分数** - 可配置0-10分期望分数（默认8分）
- **评分指导** - 固定的6-8-10三层指导体系
- **输出格式** - 统一的Markdown格式输出

## 🛠 MCP 工具列表

### 1. generate_task_analysis_prompt
分析用户对话中的核心任务
```typescript
输入：
- userMessage: string - 用户消息内容
- conversationHistory?: array - 对话历史记录
- context?: object - 额外上下文信息

输出：结构化的任务分析提示词
```

### 2. generate_quality_dimensions_prompt
生成质量维度评价提示词
```typescript
输入：
- taskAnalysisJson: string - 任务分析的JSON结果
- timezone?: string - 时区
- locale?: string - 本地化设置（默认zh-CN）
- projectPath?: string - 项目路径（用于任务追踪）

输出：专业质量维度生成提示词，自动开始任务追踪
```

### 3. generate_task_evaluation_prompt
生成任务评价提示词
```typescript
输入：
- taskId: string - 任务ID
- evaluationDimensionsJson: string - 评价维度的JSON数组
- originalTask?: string - 原始任务描述

输出：基于文件变更的任务评价提示词
```

### 4. start_task_tracking
开始任务跟踪
```typescript
输入：
- taskDescription: string - 任务描述
- projectPath: string - 项目路径
- includePatterns?: array - 要监控的文件模式
- excludePatterns?: array - 要排除的文件模式

输出：任务跟踪ID和基准状态
```

### 5. get_current_time_context
获取当前时间上下文
```typescript
输入：
- timezone?: string - 时区
- locale?: string - 本地化设置

输出：当前时间的客观信息
```

## 📁 项目结构

```
quality-dimension-generator/
├── src/
│   ├── index.ts                 # MCP服务器入口
│   ├── schema.ts               # 工具定义
│   ├── types.ts                # 类型定义
│   └── lib/
│       ├── qetDirectoryManager.ts    # 目录管理
│       ├── qualityDimensionGenerator.ts  # 维度生成器
│       ├── taskEvaluator.ts     # 任务评价器
│       ├── taskExtractor.ts     # 任务提取器
│       ├── taskTracker.ts       # 任务跟踪器
│       └── timeContextManager.ts # 时间上下文管理
├── .qdg/                       # 配置和数据目录
│   ├── config/                 # 配置文件
│   └── tasks/                  # 任务数据
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 快速开始

### 安装
```bash
# 克隆项目
git clone <repository-url>
cd quality-dimension-generator

# 安装依赖
npm install

# 构建项目
npm run build
```

### 运行
```bash
# 启动MCP服务器
npm start

# 或直接运行
node dist/index.js
```

### 配置
系统会自动创建 `.qdg` 配置目录，默认配置：
```json
{
  "dimensionCount": 5,
  "expectedScore": 8
}
```

可以通过修改 `.qdg/config/config.json` 自定义配置。

## 📊 评分体系

### 6-8-10 指导体系
- **6分** - 及格水平，满足基本要求
- **8分** - 优秀水平，超出预期表现
- **10分** - 卓越水平，业界标杆表现

### 实际评分范围
- **0-10分** - 支持完整的十分制评分
- **灵活精度** - 支持小数点评分（如7.5分）

## 🔧 集成指南

### Claude Desktop 配置
```json
{
  "mcpServers": {
    "quality-dimension-generator": {
      "command": "node",
      "args": ["path/to/quality-dimension-generator/dist/index.js"]
    }
  }
}
```

### Cline 配置
```json
{
  "mcpServers": {
    "quality-dimension-generator": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "path/to/quality-dimension-generator"
    }
  }
}
```

## 📝 使用示例

### 1. 基础工作流程
```typescript
// 1. 分析任务
const taskPrompt = await generate_task_analysis_prompt({
  userMessage: "创建一个用户友好的Web应用"
});

// 2. 生成维度
const dimensionsPrompt = await generate_quality_dimensions_prompt({
  taskAnalysisJson: taskAnalysisResult,
  projectPath: "/path/to/project"
});

// 3. 评价任务
const evaluationPrompt = await generate_task_evaluation_prompt({
  taskId: "task_123",
  evaluationDimensionsJson: dimensionsResult
});
```

### 2. 自定义配置
修改 `.qdg/config/config.json`：
```json
{
  "dimensionCount": 3,    // 生成3个维度
  "expectedScore": 9      // 期望分数9分
}
```

## 🎨 输出示例

```markdown
# 质量评价维度

**生成时间**: 2025年9月20日 14:30 CST
**任务**: Web应用开发
**维度数量**: 5个
**期望分数**: 8分

## 维度1: 用户体验设计 (权重: 20%)
**描述**: 界面友好性、交互流畅性、用户满意度
**评价标准**:
- 6分: 界面基本可用，功能完整
- 8分: 界面美观，交互流畅
- 10分: 用户体验卓越，超出预期

## 维度2: 代码质量 (权重: 20%)
...
```

## 🔍 开发和调试

### 开发模式
```bash
# 监听文件变化，自动重新构建
npm run dev
```

### 测试工具
```bash
# 使用MCP Inspector测试
npm run inspector
```

### 调试日志
服务器启动时会显示：
```
🚀 Quality Dimension Generator MCP Server running on stdio
```

## 📋 技术特性

- **TypeScript** - 完整的类型安全
- **MCP协议** - 标准的Model Context Protocol实现
- **配置驱动** - 灵活的配置管理系统
- **文件监控** - 智能的任务追踪和变更检测
- **Markdown输出** - 结构化的人类友好输出

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交变更
4. 创建 Pull Request

## 📄 许可证

MIT License

## 🆘 支持

如有问题或建议，请提交 [Issue](https://github.com/your-repo/quality-dimension-generator/issues)。

---

**Quality Dimension Generator** - 让任务评价更专业、更简单 🎯