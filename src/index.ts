#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
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
			"生成质量维度提示词并创建任务记录",
			{
				taskAnalysisJson: z.string().describe("任务分析的JSON结果"),
				targetScore: z.number().default(8).describe("目标分数（0-10分制，用于指导评价标准的严格程度）"),
				timezone: z.string().optional().describe("时区"),
				locale: z.string().default(finalConfig.language).describe("本地化设置"),
				projectPath: z.string().optional().describe("项目路径（可选，用于保存任务记录）")
			},
			async ({ taskAnalysisJson, targetScore, timezone, locale, projectPath }) => {
				try {
					// 解析任务分析结果
					const task: TaskAnalysis = JSON.parse(taskAnalysisJson);
					
					// 基于任务内容生成稳定的任务ID（相同任务内容=相同ID）
					const taskHash = crypto.createHash('md5')
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
					
					// 获取时间上下文（系统会自动检测时区）
					const timeContext = timeContextManager.getCurrentTimeContext(timezone, locale);
					
					// 检查是否已存在相同任务的文件
					let existingTaskId: string | null = null;
					if (projectPath) {
						try {
							const tasksDir = path.join(projectPath, '.qdg', 'tasks');
							if (fs.existsSync(tasksDir)) {
								const taskFolders = fs.readdirSync(tasksDir);
								// 查找包含相同hash的任务ID
								existingTaskId = taskFolders.find((folder: string) => 
									folder.includes(taskHash)
								) || null;
							}
						} catch (error) {
							// 忽略检查错误，继续创建新任务
						}
					}
					
					// 生成提示词
					const prompt = await dimensionGenerator.generateDimensionsPrompt(task, timeContext, projectPath, targetScore);
					
					let responseText = prompt;
					let finalTaskId = taskId;
					
					// 如果提供了项目路径，处理.qdg目录和任务记录
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
								responseText += `\n🎯 任务ID: ${existingTaskId}`;
								responseText += `\n📁 现有文件: ${path.relative(projectPath, existingDimensionPath)}`;
								responseText += `\n📋 状态: 可直接使用 save_quality_dimensions 工具更新评价标准`;
								
							} else {
								// 创建新的任务目录（但不创建MD文件）
								const taskDir = path.join(projectPath, '.qdg', 'tasks', taskId);
								await fs.promises.mkdir(taskDir, { recursive: true });
								
								responseText += `\n\n✅ 新任务目录已创建！`;
								responseText += `\n🎯 任务ID: ${taskId}`;
								responseText += `\n📁 任务目录: ${path.relative(projectPath, taskDir)}`;
								responseText += `\n📋 状态: 准备接收评价标准`;
							}
							
							responseText += `\n\n📋 下一步操作：`;
							responseText += `\n1. 将上述提示词复制给LLM，让其生成评价维度`;
							responseText += `\n2. 复制LLM的两个输出部分：`;
							responseText += `\n   - 提炼后的任务描述（第一个环节）`;
							responseText += `\n   - 完整的评价维度体系（第二个环节）`;
							responseText += `\n3. 使用 save_quality_dimensions 工具保存：`;
							responseText += `\n   - taskId: ${finalTaskId}`;
							responseText += `\n   - projectPath: ${projectPath}`;
							responseText += `\n   - refinedTaskDescription: [LLM第一个输出]`;
							responseText += `\n   - dimensionsContent: [LLM第二个输出]`;
							
						} catch (initError) {
							console.warn('初始化.qdg目录失败:', initError);
							responseText += `\n\n⚠️ 警告: 无法创建任务目录，但提示词已生成。错误: ${initError instanceof Error ? initError.message : String(initError)}`;
						}
					} else {
						responseText += `\n\n⚠️ 未提供项目路径，无法建立.qdg目录。请提供 projectPath 参数以启用完整功能。`;
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

	// Register: Save Quality Dimensions
	if (isToolEnabled('save_quality_dimensions')) {
		server.tool(
			"save_quality_dimensions",
			"保存LLM生成的任务提炼和评价维度标准到.qdg目录",
			{
				taskId: z.string().describe("任务ID"),
				projectPath: z.string().describe("项目路径"),
				refinedTaskDescription: z.string().describe("LLM提炼后的任务描述（第一个环节的output）"),
				dimensionsContent: z.string().describe("LLM生成的完整评价维度内容（第二个环节的output）"),
				taskAnalysisJson: z.string().optional().describe("原始任务分析JSON（可选，用于基础信息）")
			},
			async ({ taskId, projectPath, refinedTaskDescription, dimensionsContent, taskAnalysisJson }) => {
				try {
					// 确保 .qdg 目录存在
					await qdgManager.initializeQdgDirectory(projectPath);
					
					// 解析任务分析（如果提供）
					let task: any = {};
					if (taskAnalysisJson) {
						try {
							task = JSON.parse(taskAnalysisJson);
						} catch (parseError) {
							console.warn('解析taskAnalysisJson失败，继续处理:', parseError);
						}
					}
					
					// 保存完整的评价维度标准
					const dimensionFilePath = await qdgManager.saveFinalDimensionStandards(
						projectPath, 
						taskId, 
						task, 
						refinedTaskDescription,
						dimensionsContent
					);
					
					return {
						content: [{
							type: "text",
							text: `✅ 评价维度标准已成功保存！\n\n🎯 任务ID: ${taskId}\n📁 保存路径: ${path.relative(projectPath, dimensionFilePath)}\n📋 状态: 已保存LLM提炼的任务描述和评价标准\n\n🚀 现在可以开始执行任务，完成后根据保存的标准进行评价！`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text", 
							text: `❌ 保存失败: ${error instanceof Error ? error.message : String(error)}`
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