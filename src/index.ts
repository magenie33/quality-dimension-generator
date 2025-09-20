#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from 'path';
import * as fs from 'fs';
import { 
	TaskAnalysis,
	TimeContext,
	ConversationInput
} from './lib/types.js';
import { TaskExtractor } from './lib/taskExtractor.js';
import { TimeContextManager } from './lib/timeContextManager.js';
import { QualityDimensionGenerator } from './lib/qualityDimensionGenerator.js';
import { QdgDirectoryManager } from './lib/qdgDirectoryManager.js';
import { ConfigManager } from './lib/configManager.js';

/**
 * Quality Dimension Generator MCP Server
 * 专注于为任务生成明确的质量评价维度和标准
 * 
 * 核心理念：明确的任务布置 + 明确的评分方向 = 高质量输出
 */

// Configuration schema
const configSchema = z.object({
	enabledTools: z.array(z.string()).optional().describe("List of tools to enable"),
	debug: z.boolean().default(false).describe("Enable debug logging"),
	language: z.string().default("zh-CN").describe("Language preference")
});

// Export configuration for Smithery CLI
export { configSchema };
export const stateless = true;

// Main server function
export default function createServer(config: Partial<z.infer<typeof configSchema>> = {}) {
	// Apply defaults
	const finalConfig = {
		debug: config.debug ?? false,
		language: config.language ?? "zh-CN",
		enabledTools: config.enabledTools
	};
	
	// Create server instance
	const server = new McpServer({
		name: "quality-dimension-generator",
		title: "Quality Dimension Generator",
		version: "1.0.0"
	});

	// Initialize service classes
	const taskExtractor = new TaskExtractor();
	const timeContextManager = new TimeContextManager();
	const dimensionGenerator = new QualityDimensionGenerator();
	const qdgManager = new QdgDirectoryManager();
	const configManager = new ConfigManager();

	// Helper function to generate task ID
	const generateTaskId = (): string => {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `task_${timestamp}_${random}`;
	};

	// Helper function to discover projects with .qdg directories
	const discoverQdgProjects = (): Array<{qdgPath: string, projectPath: string}> => {
		const env = process.env;
		const discoveredProjects: Array<{qdgPath: string, projectPath: string}> = [];
		
		// Dynamic path discovery based on common project locations
		const commonPaths = [
			process.env.PROJECT_BASE_PATH, // Allow environment override
			'D:\\MEGA\\Projects',
			'C:\\Users\\' + (env.USERNAME || 'user') + '\\Projects',
			'C:\\Projects', 
			'D:\\Projects',
			process.cwd(), // Current working directory
			path.dirname(process.cwd()) // Parent of current directory
		].filter(Boolean); // Remove undefined/null values
		
		for (const basePath of commonPaths) {
			try {
				if (fs.existsSync(basePath!)) {
					// Check if basePath itself is a project directory
					const directQdgPath = path.join(basePath!, '.qdg');
					if (fs.existsSync(directQdgPath)) {
						discoveredProjects.push({ qdgPath: directQdgPath, projectPath: basePath! });
						continue;
					}
					
					// Search subdirectories for projects
					const items = fs.readdirSync(basePath!, { withFileTypes: true });
					for (const item of items) {
						if (item.isDirectory()) {
							const projectPath = path.join(basePath!, item.name);
							const qdgPath = path.join(projectPath, '.qdg');
							if (fs.existsSync(qdgPath)) {
								discoveredProjects.push({ qdgPath, projectPath });
							}
						}
					}
				}
			} catch (error) {
				// Continue searching other paths
			}
		}
		
		return discoveredProjects;
	};

	// Helper function to save dimension configuration in readable format
	const saveDimensionConfig = async (projectPath: string, taskId: string, task: any, prompt: string, dimensions?: any): Promise<string> => {
		const taskDir = path.join(projectPath, '.qdg', 'tasks', taskId);
		const dimensionPath = path.join(taskDir, `${taskId}_dimension.md`);
		
		// Ensure task directory exists
		if (!fs.existsSync(taskDir)) {
			fs.mkdirSync(taskDir, { recursive: true });
		}
		
		// 生成易读的 Markdown 格式
		const readableContent = `# 质量评价维度

## 任务信息
- **任务ID**: ${taskId}
- **创建时间**: ${new Date().toLocaleString('zh-CN')}
- **核心任务**: ${task.coreTask || '未指定'}

## 任务分析
${task.requirements ? `### 需求分析
${Array.isArray(task.requirements) ? task.requirements.map((req: any) => `- ${req}`).join('\n') : task.requirements}
` : ''}
${task.context ? `### 上下文信息
${task.context}
` : ''}
${task.constraints ? `### 约束条件
${Array.isArray(task.constraints) ? task.constraints.map((constraint: any) => `- ${constraint}`).join('\n') : task.constraints}
` : ''}

## 评价维度

${dimensions ? (Array.isArray(dimensions) ? dimensions.map((dim: any, index: number) => `### ${index + 1}. ${dim.name || `维度${index + 1}`}

**权重**: ${dim.weight || '1.0'} | **最高分数**: ${dim.maxScore || '2分'}

**评价标准**:
${dim.criteria ? Object.entries(dim.criteria).map(([score, desc]) => `- **${score}分**: ${desc}`).join('\n') : '待定义'}

**关键指标**:
${dim.indicators ? (Array.isArray(dim.indicators) ? dim.indicators.map((indicator: any) => `- ${indicator}`).join('\n') : dim.indicators) : '待定义'}

---`).join('\n\n') : '维度信息待LLM生成') : '维度信息待LLM生成'}

## 生成的提示词

\`\`\`
${prompt}
\`\`\`

---

**说明**: 此文件由 Quality Dimension Generator 自动生成，用于为任务提供明确的质量评价标准。
`;
		
		fs.writeFileSync(dimensionPath, readableContent, 'utf-8');
		return dimensionPath;
	};

	// Helper function to check if tool should be enabled
	const isToolEnabled = (toolName: string): boolean => {
		if (config.enabledTools && config.enabledTools.length > 0) {
			return config.enabledTools.includes(toolName);
		}
		return true; // Enable all tools by default
	};

	// Register: Generate Task Analysis Prompt
	if (isToolEnabled('generate_task_analysis_prompt')) {
		server.tool(
			"generate_task_analysis_prompt",
			"生成任务分析提示词，让LLM分析用户对话中的核心任务",
			{
				userMessage: z.string().describe("用户消息内容"),
				conversationHistory: z.array(z.object({
					role: z.enum(["user", "assistant"]),
					content: z.string(),
					timestamp: z.number().optional()
				})).optional().describe("对话历史记录"),
				context: z.record(z.unknown()).optional().describe("额外上下文信息")
			},
			async ({ userMessage, conversationHistory, context }) => {
				try {
					const conversation: ConversationInput = {
						userMessage,
						conversationHistory,
						context
					};
					
					const prompt = taskExtractor.generateTaskAnalysisPrompt(conversation);
					
					return {
						content: [{
							type: "text",
							text: prompt
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `错误: ${error instanceof Error ? error.message : String(error)}`
						}],
						isError: true
					};
				}
			}
		);
	}

	// Register: Generate Quality Dimensions Prompt
	if (isToolEnabled('generate_quality_dimensions_prompt')) {
		server.tool(
			"generate_quality_dimensions_prompt",
			"生成质量维度评价标准并保存。如果只提供任务分析，将生成提示词；如果同时提供LLM生成的评价标准，将保存到.qdg文件夹的taskID_dimension.md文件中。",
			{
				taskAnalysisJson: z.string().describe("任务分析的JSON结果"),
				generatedDimensions: z.string().optional().describe("LLM生成的完整评价标准内容（可选，如果提供则直接保存）"),
				targetScore: z.number().default(8).describe("目标分数（0-10分制，用于指导评价标准的严格程度）"),
				timezone: z.string().optional().describe("时区"),
				locale: z.string().default(finalConfig.language).describe("本地化设置"),
				projectPath: z.string().optional().describe("项目路径（可选，用于保存任务记录）")
			},
			async ({ taskAnalysisJson, generatedDimensions, targetScore, timezone, locale, projectPath }) => {
				try {
					// 解析任务分析结果
					const task: TaskAnalysis = JSON.parse(taskAnalysisJson);
					
					// 基于任务内容生成稳定的任务ID（相同任务内容=相同ID）
					const taskHash = require('crypto').createHash('md5')
						.update(JSON.stringify({
							coreTask: task.coreTask,
							taskType: task.taskType,
							domain: task.domain,
							keyElements: task.keyElements?.sort(), // 排序确保一致性
							objectives: task.objectives?.sort()
						}))
						.digest('hex')
						.substring(0, 8);
					
					const timestamp = Date.now();
					const taskId = `task_${timestamp}_${taskHash}`;
					
					// 获取时间上下文
					const timeContext = timeContextManager.getCurrentTimeContext(timezone, locale);
					
					// 检查是否已存在相同任务的文件
					let existingTaskId: string | null = null;
					if (projectPath) {
						try {
							const tasksDir = path.join(projectPath, '.qdg', 'tasks');
							if (require('fs').existsSync(tasksDir)) {
								const taskFolders = require('fs').readdirSync(tasksDir);
								// 查找包含相同hash的任务ID
								existingTaskId = taskFolders.find((folder: string) => 
									folder.includes(taskHash)
								) || null;
							}
						} catch (error) {
							// 忽略检查错误，继续创建新任务
						}
					}
					
					// 如果提供了生成的维度标准，更新现有文件
					if (generatedDimensions && projectPath) {
						try {
							// 确保 .qdg 目录存在
							await qdgManager.initializeQdgDirectory(projectPath);
							
							// 使用现有的taskId（如果存在）或当前的taskId
							const finalTaskId = existingTaskId || taskId;
							
							// 保存LLM生成的完整评价标准
							const dimensionFilePath = await qdgManager.saveDimensionStandards(projectPath, finalTaskId, task, generatedDimensions);
							
							return {
								content: [{
									type: "text",
									text: `✅ 评价标准已成功保存！\n\n🎯 任务ID: ${finalTaskId}\n📁 保存路径: ${path.relative(projectPath, dimensionFilePath)}\n🔄 文件状态: ${existingTaskId ? '已更新现有文件' : '已创建新文件'}\n\n📋 接下来可以：\n1. 开始执行任务\n2. 完成任务后根据保存的标准进行评价\n3. 使用 taskID: ${finalTaskId} 来引用这个评价标准`
								}]
							};
						} catch (saveError) {
							return {
								content: [{
									type: "text",
									text: `❌ 保存评价标准失败: ${saveError instanceof Error ? saveError.message : String(saveError)}`
								}],
								isError: true
							};
						}
					}
					
					// 第一次调用：生成提示词并建立MD文件结构（仅在不存在时）
					const prompt = await dimensionGenerator.generateDimensionsPrompt(task, timeContext, projectPath, targetScore);
					
					let responseText = prompt;
					let finalTaskId = taskId;
					
					// 如果提供了项目路径，处理.qdg目录和任务MD文件
					if (projectPath) {
						try {
							// 1. 初始化.qdg目录
							await qdgManager.initializeQdgDirectory(projectPath);
							
							// 2. 检查是否已存在任务文件
							if (existingTaskId) {
								// 使用现有任务ID
								finalTaskId = existingTaskId;
								const existingDimensionPath = path.join(projectPath, '.qdg', 'tasks', existingTaskId, `${existingTaskId}_dimension.md`);
								
								responseText += `\n\n🔄 发现相同任务的现有记录`;
								responseText += `\n🎯 使用现有任务ID: ${existingTaskId}`;
								responseText += `\n📁 现有任务文件: ${path.relative(projectPath, existingDimensionPath)}`;
								responseText += `\n📋 状态: 使用现有.qdg结构，不创建重复文件`;
								
							} else {
								// 创建新的任务目录和MD文件
								const taskDir = path.join(projectPath, '.qdg', 'tasks', taskId);
								await fs.promises.mkdir(taskDir, { recursive: true });
								
								const dimensionPath = path.join(taskDir, `${taskId}_dimension.md`);
								const initialContent = `# 质量评价标准

## 📋 任务信息
- **任务ID**: ${taskId}
- **任务Hash**: ${taskHash}
- **创建时间**: ${new Date().toLocaleString('zh-CN')}
- **核心任务**: ${task.coreTask || '未指定'}
- **任务类型**: ${task.taskType || '未指定'}
- **复杂度**: ${task.complexity || 'N/A'}/5
- **领域**: ${task.domain || '未指定'}

## 🎯 任务目标
${task.objectives ? task.objectives.map((obj: any) => `- ${obj}`).join('\n') : '无'}

## 🔑 关键要素
${task.keyElements ? task.keyElements.map((elem: any) => `- ${elem}`).join('\n') : '无'}

---

## 📝 生成的提示词

\`\`\`
${prompt}
\`\`\`

---

## ⭐ 评价维度标准

**状态**: 🕒 等待LLM生成完整的评价标准

**说明**: 
1. 使用上述提示词让LLM生成完整的评价维度
2. 生成后，再次调用此工具并提供 \`generatedDimensions\` 参数来保存完整标准
3. 系统将自动更新本文件为最终版本

---

**创建时间**: ${new Date().toISOString()}
**文档类型**: QDG质量评价标准（初始版本）
**任务状态**: 📋 已创建新任务记录，等待评价标准生成
`;
								
								// 3. 保存初始MD文件
								await fs.promises.writeFile(dimensionPath, initialContent, 'utf-8');
								
								responseText += `\n\n✅ 新任务记录已创建！`;
								responseText += `\n🎯 任务ID: ${taskId}`;
								responseText += `\n📁 任务文件: ${path.relative(projectPath, dimensionPath)}`;
								responseText += `\n📋 状态: 已建立新的.qdg目录结构和任务MD文件`;
							}
							
							responseText += `\n\n📋 下一步操作：`;
							responseText += `\n1. 请将LLM生成的完整评价标准复制`;
							responseText += `\n2. 再次调用此工具，提供相同的 taskAnalysisJson 和新增的 generatedDimensions 参数`;
							responseText += `\n3. 系统将自动更新 ${finalTaskId}_dimension.md 文件为完整版本`;
							
						} catch (initError) {
							console.warn('初始化.qdg目录或创建MD文件失败:', initError);
							responseText += `\n\n⚠️ 警告: 无法创建任务记录文件，但提示词已生成。错误: ${initError instanceof Error ? initError.message : String(initError)}`;
						}
					} else {
						responseText += `\n\n⚠️ 未提供项目路径，无法建立.qdg目录和任务记录。请提供 projectPath 参数以启用完整功能。`;
					}
					
					return {
						content: [{
							type: "text",
							text: responseText
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `错误: ${error instanceof Error ? error.message : String(error)}`
						}],
						isError: true
					};
				}
			}
		);
	}

	// Register: Get Current Time Context
	if (isToolEnabled('get_current_time_context')) {
		server.tool(
			"get_current_time_context",
			"获取当前基本的时间上下文信息（不含主观判断）",
			{
				timezone: z.string().optional().describe("时区"),
				locale: z.string().default(finalConfig.language).describe("本地化设置")
			},
			async ({ timezone, locale }) => {
				try {
					const timeContext = timeContextManager.getCurrentTimeContext(timezone, locale);

					return {
						content: [{
							type: "text",
							text: JSON.stringify(timeContext, null, 2)
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `错误: ${error instanceof Error ? error.message : String(error)}`
						}],
						isError: true
					};
				}
			}
		);
	}

	// Register: Diagnose Working Directory
	if (isToolEnabled('diagnose_working_directory')) {
		server.tool(
			"diagnose_working_directory",
			"诊断当前工作目录和MCP服务器运行环境，帮助解决路径相关问题",
			{},
			async () => {
				try {
					const cwd = process.cwd();
					const env = process.env;
					
					// Use the helper function to discover projects
					const discoveredProjects = discoverQdgProjects();
					
					const diagnosticInfo = `# MCP服务器环境诊断

## 🔍 当前运行环境
- **当前工作目录**: ${cwd}
- **用户名**: ${env.USERNAME || '未知'}
- **用户主目录**: ${env.USERPROFILE || env.HOME || '未知'}
- **Node.js版本**: ${process.version}
- **平台**: ${process.platform}

## 📁 发现的.qdg目录
${discoveredProjects.length > 0 ? discoveredProjects.map(project => `- 📁 ${project.qdgPath} (项目: ${project.projectPath})`).join('\n') : '❌ 未发现任何.qdg目录'}

## ⚠️ 问题分析
当前工作目录是 \`${cwd}\`，这通常意味着：
1. **MCP服务器启动位置**: 服务器可能从用户主目录启动
2. **客户端配置问题**: VS Code或Claude Desktop可能没有正确设置工作目录
3. **进程继承**: 子进程继承了错误的工作目录

## 💡 解决方案

### 方案1: 设置环境变量
在MCP配置中添加环境变量：
\`\`\`json
{
  "mcpServers": {
    "quality-dimension-generator": {
      "command": "node",
      "args": ["path/to/server"],
      "env": {
        "PROJECT_PATH": "${discoveredProjects.length > 0 ? discoveredProjects[0].projectPath.replace(/\\/g, '\\\\') : 'D:\\\\\\\\MEGA\\\\\\\\Projects\\\\\\\\your-project'}"
      }
    }
  }
}
\`\`\`

### 方案2: 修改启动目录
确保MCP服务器从正确的项目目录启动：
\`\`\`json
{
  "mcpServers": {
    "quality-dimension-generator": {
      "command": "node",
      "args": ["path/to/server"],
      "cwd": "${discoveredProjects.length > 0 ? discoveredProjects[0].projectPath.replace(/\\/g, '\\\\') : 'D:\\\\\\\\MEGA\\\\\\\\Projects\\\\\\\\your-project'}"
    }
  }
}
\`\`\`

### 方案3: 手动指定项目路径
在使用工具时明确指定项目路径参数。

## 🎯 推荐操作
1. 检查MCP配置文件 (\`claude_desktop_config.json\` 或 VS Code settings)
2. 添加 \`cwd\` 配置指向项目根目录
3. 或者设置 \`PROJECT_PATH\` 环境变量
4. 重启MCP服务器/客户端应用

${discoveredProjects.length > 0 ? '\n## 🔧 快速修复\n基于发现的.qdg目录，建议将工作目录设置为对应的项目根目录。' : ''}
`;

					return {
						content: [{
							type: "text",
							text: diagnosticInfo
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `诊断失败: ${error instanceof Error ? error.message : String(error)}`
						}],
						isError: true
					};
				}
			}
		);
	}

	return server;
}

// CLI entry point for standalone usage  
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js')) {
	async function main() {
		const server = createServer({ debug: true, language: "zh-CN" });
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error("🚀 Quality Dimension Generator MCP Server running on stdio");
	}
	
	main().catch((error) => {
		console.error("❌ Server startup failed:", error);
		process.exit(1);
	});
}