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
 * Focused on generating clear quality evaluation dimensions and standards for tasks
 * 
 * Core Philosophy: Clear Task Definition + Clear Scoring Direction = High Quality Output
 */

// Configuration schema
const configSchema = z.object({
	enabledTools: z.array(z.string()).optional().describe("List of tools to enable"),
	debug: z.boolean().default(false).describe("Enable debug logging")
});

// Export configuration for Smithery CLI
export { configSchema };
export const stateless = true;

// Main server function
export default function createServer(config: Partial<z.infer<typeof configSchema>> = {}) {
	// Apply defaults
	const finalConfig = {
		debug: config.debug ?? false,
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
		
		// Generate readable Markdown format
		const readableContent = `# Quality Evaluation Dimensions

## Task Information
- **Task ID**: ${taskId}
- **Created**: ${new Date().toLocaleString('en-US')}
- **Core Task**: ${task.coreTask || 'Not specified'}

## Task Analysis
${task.requirements ? `### Requirements Analysis
${Array.isArray(task.requirements) ? task.requirements.map((req: any) => `- ${req}`).join('\n') : task.requirements}
` : ''}
${task.context ? `### Context Information
${task.context}
` : ''}
${task.constraints ? `### Constraints
${Array.isArray(task.constraints) ? task.constraints.map((constraint: any) => `- ${constraint}`).join('\n') : task.constraints}
` : ''}

## Evaluation Dimensions

${dimensions ? (Array.isArray(dimensions) ? dimensions.map((dim: any, index: number) => `### ${index + 1}. ${dim.name || `Dimension ${index + 1}`}

**Weight**: ${dim.weight || '1.0'} | **Max Score**: ${dim.maxScore || '2 points'}

**Evaluation Criteria**:
${dim.criteria ? Object.entries(dim.criteria).map(([score, desc]) => `- **${score} points**: ${desc}`).join('\n') : 'To be defined'}

**Key Indicators**:
${dim.indicators ? (Array.isArray(dim.indicators) ? dim.indicators.map((indicator: any) => `- ${indicator}`).join('\n') : dim.indicators) : 'To be defined'}

---`).join('\n\n') : 'Dimension information to be generated by LLM') : 'Dimension information to be generated by LLM'}

## Generated Prompt

\`\`\`
${prompt}
\`\`\`

---

**Note**: This file is automatically generated by Quality Dimension Generator to provide clear quality evaluation standards for tasks.
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
			"Generate task analysis prompt for LLM to analyze core tasks in user conversations",
			{
				userMessage: z.string().describe("User message content"),
				conversationHistory: z.array(z.object({
					role: z.enum(["user", "assistant"]),
					content: z.string(),
					timestamp: z.number().optional()
				})).optional().describe("Conversation history records"),
				context: z.record(z.unknown()).optional().describe("Additional context information")
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
							text: `Error: ${error instanceof Error ? error.message : String(error)}`
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
			"Generate quality dimensions prompt and create task records",
			{
				taskAnalysisJson: z.string().describe("Task analysis JSON result"),
				targetScore: z.number().default(8).describe("Target score (0-10 scale, used to guide evaluation criteria strictness)"),
				timezone: z.string().optional().describe("Timezone"),
				locale: z.string().default("en-US").describe("Localization settings"),
				projectPath: z.string().optional().describe("Project path (optional, for saving task records)")
			},
			async ({ taskAnalysisJson, targetScore, timezone, locale, projectPath }) => {
				try {
					// Parse task analysis result
					const task: TaskAnalysis = JSON.parse(taskAnalysisJson);
					
					// Generate stable task ID based on task content (same task content = same ID)
					const taskHash = crypto.createHash('md5')
						.update(JSON.stringify({
							coreTask: task.coreTask,
							taskType: task.taskType,
							domain: task.domain,
							keyElements: task.keyElements?.sort(), // Sort to ensure consistency
							objectives: task.objectives?.sort()
						}))
						.digest('hex')
						.substring(0, 8);
					
					const timestamp = Date.now();
					const taskId = `task_${timestamp}_${taskHash}`;
					
					// Get time context (system will auto-detect timezone)
					const timeContext = timeContextManager.getCurrentTimeContext(timezone, locale);
					
					// Check if same task file already exists
					let existingTaskId: string | null = null;
					if (projectPath) {
						try {
							const tasksDir = path.join(projectPath, '.qdg', 'tasks');
							if (fs.existsSync(tasksDir)) {
								const taskFolders = fs.readdirSync(tasksDir);
								// Find task ID containing the same hash
								existingTaskId = taskFolders.find((folder: string) => 
									folder.includes(taskHash)
								) || null;
							}
						} catch (error) {
							// Ignore check errors, continue creating new task
						}
					}
					
					// Generate prompt
					const prompt = await dimensionGenerator.generateDimensionsPrompt(task, timeContext, projectPath, targetScore);
					
					let responseText = prompt;
					let finalTaskId = taskId;
					
					// If project path provided, handle .qdg directory and task records
					if (projectPath) {
						try {
							// 1. Initialize .qdg directory
							await qdgManager.initializeQdgDirectory(projectPath);
							
							// 2. Check if task file already exists
							if (existingTaskId) {
								// Use existing task ID
								finalTaskId = existingTaskId;
								const existingDimensionPath = path.join(projectPath, '.qdg', 'tasks', existingTaskId, `${existingTaskId}_dimension.md`);
								
								responseText += `\n\n🔄 Found existing record for same task`;
								responseText += `\n🎯 Task ID: ${existingTaskId}`;
							responseText += `\n📁 Existing file: ${path.relative(projectPath, existingDimensionPath)}`;
							responseText += `\n📋 Status: Can directly use save_quality_dimensions tool to update evaluation standards`;							} else {
								// Create new task directory (but don't create MD file)
								const taskDir = path.join(projectPath, '.qdg', 'tasks', taskId);
								await fs.promises.mkdir(taskDir, { recursive: true });
								
								responseText += `\n\n✅ New task directory created!`;
								responseText += `\n🎯 Task ID: ${taskId}`;
								responseText += `\n📁 Task directory: ${path.relative(projectPath, taskDir)}`;
								responseText += `\n📋 Status: Ready to receive evaluation standards`;
							}
							
						responseText += `\n\n📋 Next Steps:`;
						responseText += `\n1. Copy the above prompt to LLM to generate evaluation dimensions`;
						responseText += `\n2. Copy LLM's two output parts:`;
						responseText += `\n   - Refined task description (first stage output)`;
						responseText += `\n   - Complete evaluation dimension system (second stage output)`;
						responseText += `\n3. Use save_quality_dimensions tool to save:`;
						responseText += `\n   - taskId: ${finalTaskId}`;
						responseText += `\n   - projectPath: ${projectPath}`;
						responseText += `\n   - refinedTaskDescription: [LLM first output]`;
						responseText += `\n   - dimensionsContent: [LLM second output]`;						} catch (initError) {
							console.warn('Failed to initialize .qdg directory:', initError);
							responseText += `\n\n⚠️ Warning: Unable to create task directory, but prompt has been generated. Error: ${initError instanceof Error ? initError.message : String(initError)}`;
						}
					} else {
						responseText += `\n\n⚠️ Project path not provided, unable to establish .qdg directory. Please provide projectPath parameter to enable full functionality.`;
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
							text: `Error: ${error instanceof Error ? error.message : String(error)}`
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
			"Get current basic time context information",
			{
				timezone: z.string().optional().describe("Timezone"),
				locale: z.string().default("en-US").describe("Localization settings")
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
							text: `Error: ${error instanceof Error ? error.message : String(error)}`
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
			"Save LLM-generated task refinement and evaluation dimension standards to .qdg directory",
			{
				taskId: z.string().describe("Task ID"),
				projectPath: z.string().describe("Project path"),
				refinedTaskDescription: z.string().describe("LLM-refined task description (first stage output)"),
				dimensionsContent: z.string().describe("LLM-generated complete evaluation dimension content (second stage output)"),
				taskAnalysisJson: z.string().optional().describe("Original task analysis JSON (optional, for basic information)")
			},
			async ({ taskId, projectPath, refinedTaskDescription, dimensionsContent, taskAnalysisJson }) => {
				try {
					// Ensure .qdg directory exists
					await qdgManager.initializeQdgDirectory(projectPath);
					
					// Parse task analysis (if provided)
					let task: any = {};
					if (taskAnalysisJson) {
						try {
							task = JSON.parse(taskAnalysisJson);
						} catch (parseError) {
							console.warn('Failed to parse taskAnalysisJson, continuing:', parseError);
						}
					}
					
					// Extract task name from task analysis or use fallback
					const taskName = task.taskName || 'UnnamedTask';
					
					// Save using new flat file structure with LLM-generated task name
					const outputFilePath = await qdgManager.saveFinalDimensionStandardsFlat(
						projectPath, 
						taskId,
						taskName,
						task,
						refinedTaskDescription,
						dimensionsContent
					);
					
					return {
						content: [{
							type: "text",
							text: `✅ Quality evaluation standards saved successfully!\n\n🎯 Task ID: ${taskId}\n📝 Task Name: ${taskName}\n📁 Saved file: ${path.relative(projectPath, outputFilePath)}\n📋 Status: Task description and evaluation standards saved in flat file structure\n\n🚀 Now you can start executing the task and evaluate according to the saved standards after completion!`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text", 
							text: `❌ Save failed: ${error instanceof Error ? error.message : String(error)}`
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
			"Diagnose current working directory and MCP server runtime environment, help solve path-related issues",
			{},
			async () => {
				try {
					const cwd = process.cwd();
					const env = process.env;
					
					// Use the helper function to discover projects
					const discoveredProjects = discoverQdgProjects();
					
					const diagnosticInfo = `# MCP Server Environment Diagnosis

## 🔍 Current Runtime Environment
- **Current Working Directory**: ${cwd}
- **Username**: ${env.USERNAME || 'Unknown'}
- **User Home Directory**: ${env.USERPROFILE || env.HOME || 'Unknown'}
- **Node.js Version**: ${process.version}
- **Platform**: ${process.platform}

## 📁 Discovered .qdg Directories
${discoveredProjects.length > 0 ? discoveredProjects.map(project => `- 📁 ${project.qdgPath} (Project: ${project.projectPath})`).join('\n') : '❌ No .qdg directories found'}

## ⚠️ Problem Analysis
Current working directory is \`${cwd}\`, this usually means:
1. **MCP Server Launch Location**: Server may be started from user home directory
2. **Client Configuration Issue**: VS Code or Claude Desktop may not have correctly set working directory
3. **Process Inheritance**: Child process inherited incorrect working directory

## 💡 Solutions

### Solution 1: Set Environment Variables
Add environment variables in MCP configuration:
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

### Solution 2: Modify Launch Directory
Ensure MCP server starts from correct project directory:
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

### Solution 3: Manually Specify Project Path
Explicitly specify project path parameter when using tools.

## 🎯 Recommended Actions
1. Check MCP configuration file (\`claude_desktop_config.json\` or VS Code settings)
2. Add \`cwd\` configuration pointing to project root directory
3. Or set \`PROJECT_PATH\` environment variable
4. Restart MCP server/client application

${discoveredProjects.length > 0 ? '\n## 🔧 Quick Fix\nBased on discovered .qdg directories, recommend setting working directory to the corresponding project root directory.' : ''}
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
							text: `Diagnosis failed: ${error instanceof Error ? error.message : String(error)}`
						}],
						isError: true
					};
				}
			}
		);
	}

	return server; // For Smithery deployment, this should be the McpServer instance
}

// CLI entry point for standalone usage (only when not imported as module)
// This block will be removed by bundlers when imported as a module
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('index.js')) {
	async function main() {
		const server = createServer({ debug: true });
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error("🚀 Quality Dimension Generator MCP Server running on stdio");
	}
	
	main().catch((error) => {
		console.error("❌ Server startup failed:", error);
		process.exit(1);
	});
}