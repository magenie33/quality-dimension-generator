# Quality Dimension Generator MCP Server

一个基于 Model Context Protocol (MCP) 的智能质量维度生成器，专注于为任务评价提供专业、可配置的质量评价维度。

## 🎯 核心理念

**双环节输出，职责分离**
- ✅ **任务提炼** - LLM智能提炼和优化任务描述
- ✅ **维度生成** - LLM生成专业的评价维度标准  
- ✅ **双输出保存** - 分别保存任务提炼和评价标准
- ✅ **6-8-10评分指导** - 6分及格、8分优秀、10分卓越的三层指导体系
- ✅ **灵活评分范围** - 实际评分支持完整的0-10分制
- ✅ **时区自动检测** - 智能检测系统时区，无需手动配置
- ✅ **Markdown输出** - 人类友好的格式化输出

## 🌟 功能特性

### 核心工作流程
1. **任务分析** - 从用户对话中智能提取核心任务
2. **提示词生成** - 生成专业的LLM提示词并创建任务记录
3. **双输出处理** - LLM返回任务提炼+评价维度两个部分
4. **结果保存** - 保存完整的任务和评价标准文档

### 配置特性
- **维度数量** - 可配置1-10个维度（默认5个）
- **期望分数** - 可配置0-10分期望分数（默认8分）
- **智能去重** - 基于任务内容hash的智能去重
- **目录管理** - 自动管理.qdg目录结构

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
生成质量维度提示词并创建任务记录
```typescript
输入：
- taskAnalysisJson: string - 任务分析的JSON结果
- targetScore?: number - 目标分数（默认8分）
- timezone?: string - 时区
- locale?: string - 本地化设置（默认zh-CN）
- projectPath?: string - 项目路径（用于保存任务记录）

输出：格式化的提示词 + 任务ID + 使用说明
```

### 3. save_quality_dimensions ⭐ 
保存LLM生成的双输出结果
```typescript
输入：
- taskId: string - 任务ID
- projectPath: string - 项目路径
- refinedTaskDescription: string - LLM提炼的任务描述（第一环节输出）
- dimensionsContent: string - LLM生成的评价维度（第二环节输出）
- taskAnalysisJson?: string - 原始任务分析JSON（可选）

输出：✅ 保存成功确认 + 文件路径
```

### 4. get_current_time_context
获取当前时间上下文（自动检测时区）
```typescript
输入：
- timezone?: string - 时区（可选，不指定则自动检测系统时区）
- locale?: string - 本地化设置

输出：当前时间的客观信息，包含自动检测的时区
```

### 5. diagnose_working_directory
诊断工作目录和环境
```typescript
输入：无

输出：当前工作目录状态和配置建议
```

## � 完整工作流程

### 🔄 标准三步流程

#### 步骤1: 分析任务
```typescript
// 从用户对话中提取任务
const taskPrompt = await generate_task_analysis_prompt({
  userMessage: "创作感人短文《最后一封信》并进行质量评估"
});
// 将提示词发给LLM，获得任务分析JSON
```

#### 步骤2: 生成提示词
```typescript
// 生成评价维度的提示词
const dimensionsPrompt = await generate_quality_dimensions_prompt({
  taskAnalysisJson: taskAnalysisResult,
  projectPath: "d:\\MEGA\\Projects\\mcp-test",
  targetScore: 8
});
// 输出: 格式化提示词 + 任务ID（如: task_1758354881691_3041bc0b）
```

#### 步骤3: 处理LLM输出并保存
```typescript
// LLM会返回两个部分：
// 1. 任务提炼（第一环节输出）
// 2. 评价维度体系（第二环节输出）

// 保存双输出结果
const saveResult = await save_quality_dimensions({
  taskId: "task_1758354881691_3041bc0b",
  projectPath: "d:\\MEGA\\Projects\\mcp-test",
  refinedTaskDescription: "[LLM第一个输出]",
  dimensionsContent: "[LLM第二个输出]"
});
```

### 💡 LLM输出示例

**第一环节输出（任务提炼）**：
```
## 任务提炼

**核心任务**：创作一篇感人短文《最后一封信》，通过细腻的情感描述和深刻的人物刻画，传达生命的珍贵和人性的美好。

**任务特点**：
- 类型：情感文学创作
- 复杂度：中高等（4/5）
- 目标读者：寻求情感共鸣的文学爱好者
- 核心价值：触动心灵，启发思考

**关键要求**：
- 情感真挚，避免煽情
- 人物形象立体可信
- 语言优美流畅
- 主题积极向上
- 结构完整有层次
```

**第二环节输出（评价维度）**：
```
感人短文评价维度体系

维度1：情感深度与感染力 (0-10分)
描述：评估文章的情感表达深度和对读者的感染力
重要性：情感深度是感人文学的核心，决定作品的感染力和共鸣效果
评分指导：
- 10分：情感表达深刻真挚，能引发读者强烈的情感共鸣和深层思考
- 8分：情感表达较为深刻，有较强的感染力，能触动读者内心
- 6分：有基本的情感表达，但深度和感染力一般

维度2：人物刻画与性格塑造 (0-10分)
[继续其他4个维度...]
```

## � 项目结构

```
quality-dimension-generator/
├── src/
│   ├── index.ts                 # MCP服务器入口
│   ├── schema.ts               # 工具Schema定义
│   └── lib/
│       ├── configManager.ts         # 配置管理
│       ├── qdgDirectoryManager.ts    # 目录管理
│       ├── qualityDimensionGenerator.ts  # 维度生成器
│       ├── taskExtractor.ts         # 任务提取器
│       ├── timeContextManager.ts    # 时间上下文管理
│       └── types.ts                 # 类型定义
├── .qdg/                       # 配置和数据目录（自动生成）
│   ├── config/
│   │   └── qdg.config.json     # 项目配置
│   └── tasks/
│       └── [taskId]/
│           └── [taskId]_dimension.md  # 保存的评价标准
├── package.json
├── tsconfig.json
└── README.md
```

## �🚀 快速开始

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
  "settings": {
    "dimensionCount": 5,
    "expectedScore": 8
  }
}
```

可以通过修改 `.qdg/config/qdg.config.json` 自定义配置：
- `dimensionCount`: 评价维度数量（1-10）
- `expectedScore`: 期望分数（0-10）

**时区自动检测**：系统会自动检测并使用运行环境的时区设置，无需手动配置。

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
      "args": ["path/to/quality-dimension-generator/dist/index.js"],
      "cwd": "path/to/your-project"
    }
  }
}
```

### Cline/VSCode 配置
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

## 🎨 输出示例

### 最终保存的文件格式
```markdown
# 质量评价标准

## 📋 任务提炼（第一个环节输出）

**核心任务**：创作一篇感人短文《最后一封信》，通过细腻的情感描述和深刻的人物刻画，传达生命的珍贵和人性的美好。

**任务特点**：
- 类型：情感文学创作
- 复杂度：中高等（4/5）
- 目标读者：寻求情感共鸣的文学爱好者
- 核心价值：触动心灵，启发思考

**关键要求**：
- 情感真挚，避免煽情
- 人物形象立体可信
- 语言优美流畅
- 主题积极向上
- 结构完整有层次

---

## ⭐ 评价维度体系（第二个环节输出）

感人短文评价维度体系

维度1：情感深度与感染力 (0-10分)
描述：评估文章的情感表达深度和对读者的感染力
重要性：情感深度是感人文学的核心，决定作品的感染力和共鸣效果
评分指导：
- 10分：情感表达深刻真挚，能引发读者强烈的情感共鸣和深层思考
- 8分：情感表达较为深刻，有较强的感染力，能触动读者内心
- 6分：有基本的情感表达，但深度和感染力一般

维度2：人物刻画与性格塑造 (0-10分)
描述：评估文章中人物形象的立体性和性格塑造的成功程度
重要性：生动的人物形象是情感共鸣的载体，决定故事的可信度
评分指导：
- 10分：人物形象鲜明立体，性格特征突出，行为逻辑一致
- 8分：人物刻画较为成功，有一定的个性特征
- 6分：人物形象基本清晰，但缺乏深度和特色

[继续其他3个维度...]

---

## 📊 使用说明

**任务ID**: task_1758354881691_3041bc0b
**生成时间**: 2025/9/20 16:30:15

**评分方式**: 每个维度可给0-10分任意数字（包括小数点）
**参考标准**: 6分及格、8分优秀、10分卓越
**最终分数**: 所有维度得分的平均值

**状态**: ✅ 任务提炼和评价标准已完成，可开始执行任务

---

*Quality Dimension Generator - 双环节输出完整版*
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

## ✨ 核心优势

### 🎯 **职责分离设计**
- **工具1**: 专门生成提示词，创建任务记录
- **工具2**: 专门保存LLM的双输出结果
- **清晰流程**: 提示词生成 → LLM处理 → 结果保存

### 📋 **双环节输出**
- **第一环节**: LLM提炼和优化任务描述
- **第二环节**: LLM生成具体评价维度标准
- **完整保存**: 任务+评价标准的完整文档

### 🔄 **智能管理**
- **任务去重**: 基于内容hash的智能去重
- **目录管理**: 自动创建和管理.qdg结构
- **配置驱动**: 灵活的项目级配置

## 📋 技术特性

- **TypeScript** - 完整的类型安全
- **MCP协议** - 标准的Model Context Protocol实现
- **ES模块** - 现代化的模块系统
- **智能去重** - MD5 hash防重复任务
- **时区自动检测** - 无需配置，自动适应运行环境
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

**Quality Dimension Generator** - 双环节输出，专业质量评价 🎯