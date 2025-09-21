# Quality Dimension Generator MCP Server

An intelligent quality dimension generator based on Model Context Protocol (MCP), focused on providing professional and configurable quality evaluation dimensions for task assessment.

## 🎯 Core Philosophy

**Dual-Output Workflow with Clear Separation of Concerns**
- ✅ **Task Refinement** - LLM intelligently refines and optimizes task descriptions
- ✅ **Dimension Generation** - LLM generates professional evaluation dimension standards  
- ✅ **Dual Output Saving** - Separately saves task refinement and evaluation standards
- ✅ **6-8-10 Scoring Guide** - Three-tier guidance system: 6 (pass), 8 (excellent), 10 (outstanding)
- ✅ **Flexible Scoring Range** - Actual scoring supports full 0-10 scale
- ✅ **Automatic Timezone Detection** - Intelligent system timezone detection, no manual configuration needed
- ✅ **Markdown Output** - Human-friendly formatted output

## 🌟 Features

### Core Workflow
1. **Task Analysis** - Intelligently extract core tasks from user conversations
2. **Prompt Generation** - Generate professional LLM prompts and create task records
3. **Dual Output Processing** - LLM returns both task refinement and evaluation dimensions
4. **Result Saving** - Save complete task and evaluation standard documents

### Configuration Features
- **Dimension Count** - Configurable 1-10 dimensions (default: 5)
- **Expected Score** - Configurable 0-10 expected score (default: 8)
- **Smart Deduplication** - Intelligent deduplication based on task content hash
- **Directory Management** - Automatic .qdg directory structure management

## 🛠 MCP Tools

### 1. generate_task_analysis_prompt
Analyze core tasks from user conversations
```typescript
Input:
- userMessage: string - User message content  
- conversationHistory?: array - Conversation history
- context?: object - Additional context information

Output: Structured task analysis prompt
```

### 2. generate_quality_dimensions_prompt  
Generate quality dimension prompts and create task records
```typescript
Input:
- taskAnalysisJson: string - Task analysis JSON result
- targetScore?: number - Target score (default: 8)
- timezone?: string - Timezone
- locale?: string - Localization setting (default: en-US)
- projectPath?: string - Project path (for saving task records)

Output: Professional LLM prompt for dimension generation
```

### 3. save_quality_dimensions
Save LLM-generated task refinement and evaluation dimensions
```typescript
Input:
- taskId: string - Task ID
- projectPath: string - Project path
- refinedTaskDescription: string - LLM refined task description
- dimensionsContent: string - LLM generated evaluation dimensions
- taskAnalysisJson?: string - Original task analysis JSON

Output: Clean formatted output file with task description and evaluation dimensions
```

### 4. get_current_time_context
Get current basic time context information
```typescript
Input:
- locale?: string - Localization setting (default: en-US)
- timezone?: string - Timezone (auto-detected if not provided)

Output: Current time context without subjective judgments
```

## 📁 Directory Structure

The tool creates a `.qdg` directory in your project root:

```
.qdg/
├── config/
│   └── qdg.config.json     # Simplified configuration
└── tasks/
    └── task_[timestamp]_[hash]/
        └── task_[id]_output.md  # Clean task description + evaluation dimensions
```

### Configuration File
The `.qdg/config/qdg.config.json` contains minimal settings:
```json
{
  "settings": {
    "dimensionCount": 5,    # Number of evaluation dimensions (1-10)
    "expectedScore": 8      # Expected score level (0-10)
  }
}
```

## 🚀 Usage Example

### Complete Workflow

1. **Extract Task from Conversation**
```javascript
// Call generate_task_analysis_prompt
{
  "userMessage": "I need to write a compelling product description for our new smartwatch",
  "conversationHistory": [...],
}
```

2. **Generate Quality Dimensions Prompt**
```javascript
// Call generate_quality_dimensions_prompt  
{
  "taskAnalysisJson": "{\"coreTask\": \"Write compelling smartwatch product description\", ...}",
  "projectPath": "/path/to/project",
  "targetScore": 8,
  "locale": "en-US"
}
```

3. **Process with LLM**
Take the generated prompt, send it to your LLM, and get:
- **Part 1**: Refined task description
- **Part 2**: Professional evaluation dimensions

4. **Save Results**
```javascript
// Call save_quality_dimensions
{
  "taskId": "task_1234567890_abc123",
  "projectPath": "/path/to/project",
  "refinedTaskDescription": "[LLM refined task description]",
  "dimensionsContent": "[LLM generated evaluation dimensions]"
}
```

### Example Output File
The saved file contains clean, focused content:

```markdown
# Task Description

## Core Task
Write a compelling product description for our new smartwatch

## Requirements
- Target audience: Tech-savvy consumers aged 25-40
- Length: 150-200 words
- Highlight key features: health monitoring, battery life, design
- Include emotional appeal and technical specifications

---

# Evaluation Dimensions

## Evaluation Dimensions (5 dimensions, 10 points each)

### 1. Content Accuracy (10 points)
- 8-10 points: All technical specifications are accurate and verifiable
- 6-7 points: Most information is accurate with minor discrepancies
- 4-5 points: Some inaccuracies present
- 0-3 points: Significant inaccuracies or misleading information

### 2. Persuasive Appeal (10 points)
- 8-10 points: Highly compelling, creates strong desire to purchase
- 6-7 points: Moderately persuasive with good appeal
- 4-5 points: Some persuasive elements present
- 0-3 points: Weak or ineffective persuasive appeal

[... additional dimensions ...]
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- TypeScript
- Model Context Protocol compatible client

### Local Development
```bash
# Clone the repository
git clone https://github.com/magenie33/quality-dimension-generator.git
cd quality-dimension-generator

# Install dependencies
npm install

# Build the project
npm run build

# Run locally with MCP Inspector
npm run dev:legacy

# Or run with Smithery CLI
npm run dev
```

### Smithery.ai Deployment
This server is optimized for deployment on [Smithery.ai](https://smithery.ai):

1. Push your code to GitHub
2. Connect your repository to Smithery
3. Deploy with one click

The server includes:
- `smithery.yaml` configuration
- Proper module exports for Smithery
- Automatic timezone detection
- Stateless design for cloud deployment

## 🎨 Design Principles

### Clean Output Focus
- **Minimal Formatting**: Output files contain only essential content
- **No Meta Information**: No timestamps, tool signatures, or usage instructions in final output
- **Pure Content**: Just the refined task description and evaluation dimensions

### Smart Task Management
- **Content-Based Deduplication**: Same task content generates same task ID
- **Hash-Based Identification**: Uses MD5 hash of core task elements
- **Automatic Directory Creation**: Seamless .qdg directory management

### Professional Standards
- **Evidence-Based Evaluation**: Each dimension includes clear scoring criteria
- **Flexible Scoring**: Supports decimal scores for precise evaluation
- **Standardized Format**: Consistent output format across all tasks

## 📊 Configuration Options

### Tool-Level Configuration
- `enabledTools`: Array of tools to enable
- `debug`: Enable debug logging
- `language`: Language preference (default: "en-US")

### Project-Level Configuration  
- `dimensionCount`: Number of evaluation dimensions (1-10)
- `expectedScore`: Target score level for guidance (0-10)

### Runtime Options
- Automatic timezone detection
- Configurable output localization
- Project-specific settings

## 🔍 Advanced Features

### Intelligent Task Analysis
- Extracts core tasks from conversational input
- Identifies task type, domain, and complexity
- Suggests key elements and objectives
- Provides structured analysis for dimension generation

### Professional Dimension Generation
- Creates domain-specific evaluation criteria
- Includes detailed scoring rubrics
- Provides clear performance indicators
- Supports various task types and complexities

### Clean Output Management
- Generates human-readable markdown files
- Maintains version history through task IDs
- Enables easy sharing and collaboration
- Supports both single-file and multi-file workflows

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Issues & Support

If you encounter any issues or have questions, please [open an issue](https://github.com/magenie33/quality-dimension-generator/issues) on GitHub.

---

*Quality Dimension Generator - Professional task evaluation made simple*

Output: Formatted prompts + Task ID + Usage instructions
```

### 3. save_quality_dimensions ⭐ 
Save LLM-generated dual output results
```typescript
Input:
- taskId: string - Task ID
- projectPath: string - Project path
- refinedTaskDescription: string - LLM-refined task description (first stage output)
- dimensionsContent: string - LLM-generated evaluation dimensions (second stage output)
- taskAnalysisJson?: string - Original task analysis JSON (optional)

Output: ✅ Save success confirmation + File paths
```

### 4. get_current_time_context
Get current time context (auto-detect timezone)
```typescript
Input:
- timezone?: string - Timezone (optional, auto-detect system timezone if not specified)
- locale?: string - Localization settings

Output: Current time objective information, including auto-detected timezone
```

### 5. diagnose_working_directory
Diagnose working directory and environment
```typescript
Input: None

Output: Current working directory status and configuration recommendations
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