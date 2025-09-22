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

	// Helper function to get project path (optional, skip file operations if not provided)
	const getProjectPath = (providedPath?: string): string | null => {
		if (!providedPath) {
			console.log('[QDG] No project path provided, skipping file operations');
			return null;
		}
		
		const resolvedPath = path.resolve(providedPath);
		console.log(`[QDG] Using project path: ${resolvedPath}`);
		
		// Verify the path exists and is absolute
		if (!path.isAbsolute(resolvedPath)) {
			throw new Error(`Project path must be absolute. Provided: ${providedPath}`);
		}
		
		if (!fs.existsSync(resolvedPath)) {
			throw new Error(`Project path does not exist: ${resolvedPath}`);
		}
		
		return resolvedPath;
	};

	// Helper function to ensure .qdg directory for any tool (skip if no project path)
	const ensureQdgDirectory = async (projectPath?: string): Promise<string | null> => {
		const resolvedPath = getProjectPath(projectPath);
		if (!resolvedPath) {
			return null; // Skip file operations
		}
		await qdgManager.initializeQdgDirectory(resolvedPath);
		return resolvedPath;
	};
	const discoverQdgProjects = (): Array<{qdgPath: string, projectPath: string}> => {
		const discoveredProjects: Array<{qdgPath: string, projectPath: string}> = [];
		
		// Only check current directory for .qdg projects
		const currentDir = process.cwd();
		const qdgPath = path.join(currentDir, '.qdg');
		
		if (fs.existsSync(qdgPath)) {
			discoveredProjects.push({ qdgPath, projectPath: currentDir });
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
				context: z.record(z.unknown()).optional().describe("Additional context information"),
				projectPath: z.string().optional().describe("Optional: Absolute path to the project directory where .qdg should be created (e.g., '/home/user/my-project' or 'C:\\\\Users\\\\Username\\\\Projects\\\\MyProject'). Must be absolute path if provided. If not provided, will only return content.")
			},
			async ({ userMessage, conversationHistory, context, projectPath }) => {
				try {
					// Try to ensure .qdg directory if project path provided
					const resolvedProjectPath = await ensureQdgDirectory(projectPath);
					
					const conversation: ConversationInput = {
						userMessage,
						conversationHistory,
						context
					};
					
					const prompt = taskExtractor.generateTaskAnalysisPrompt(conversation);
					
					let setupMessage = "";
					if (resolvedProjectPath) {
						setupMessage = `✅ **PROJECT SETUP**: Initialized .qdg directory at \`${resolvedProjectPath}\`\n\n`;
					} else {
						setupMessage = `ℹ️ **NO PROJECT PATH**: Running without file system access - content will be returned only\n\n`;
					}
					
					return {
						content: [{
							type: "text",
							text: `🎯 **STAGE 1 COMPLETE: Task Analysis Prompt Generated**

${setupMessage}📋 **LLM INSTRUCTIONS - Execute Automatically:**

**Step 1**: Execute the prompt below to get task analysis JSON
**Step 2**: Call \`generate_quality_dimensions_prompt\` with the JSON (optional: set targetScore 1-10 to adjust evaluation strictness, default=8)
**Step 3**: Optionally call \`save_quality_dimensions\` to save standards to file system (skip if no projectPath provided)

⚠️ **LLM**: Execute the prompt below to get JSON output, then automatically proceed to Stage 2!

**🎯 Purpose**: These stages help you fully understand the task and establish clear quality standards before beginning execution, ensuring higher quality results. File saving is optional - you can work with the generated content directly or save it for future reference.

---

## 📝 Task Analysis Prompt:

${prompt}

---

🔄 **WORKFLOW STATUS**: Stage 1/3 Complete → **Next: Execute the above prompt**`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ **STAGE 1 ERROR**: Task analysis prompt generation failed\n\n🔧 **Error Details**: ${error instanceof Error ? error.message : String(error)}\n\n💡 **Troubleshooting**:\n- Check your input parameters\n- Ensure conversation history format is correct\n- Try again with simplified input\n\n🔄 **WORKFLOW STATUS**: ❌ Stage 1/3 Failed → **Fix error and retry**`
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
			"Generate quality dimensions prompt and create task records. Use targetScore (8 default) to set evaluation strictness: higher scores create stricter professional standards, lower scores create more lenient learning-focused criteria.",
			{
				taskAnalysisJson: z.string().describe("Task analysis JSON result"),
				targetScore: z.number().default(8).describe("Target score (0-10 scale, used to guide evaluation criteria strictness)"),
				timezone: z.string().optional().describe("Timezone"),
				locale: z.string().default("en-US").describe("Localization settings"),
				projectPath: z.string().optional().describe("Optional: Absolute path to the project directory where .qdg should be created (e.g., '/home/user/my-project' or 'C:\\\\Users\\\\Username\\\\Projects\\\\MyProject'). Must be absolute path if provided. If not provided, will only return content.")
			},
			async ({ taskAnalysisJson, targetScore, timezone, locale, projectPath }) => {
				try {
					// Try to ensure .qdg directory if project path provided
					const resolvedProjectPath = await ensureQdgDirectory(projectPath);
					
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
					
					// Generate prompt (pass null instead of undefined for projectPath)
					const prompt = await dimensionGenerator.generateDimensionsPrompt(task, timeContext, resolvedProjectPath || undefined, targetScore);
					
					let responseText = prompt;
					let finalTaskId = taskId;
					
					// Handle .qdg directory and task records only if we have a project path
					if (resolvedProjectPath) {
						// Check if same task file already exists
						let existingTaskId: string | null = null;
						try {
							const tasksDir = path.join(resolvedProjectPath, '.qdg', 'tasks');
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
						
						try {
							// Check if task file already exists
							if (existingTaskId) {
								// Use existing task ID
								finalTaskId = existingTaskId;
								const existingDimensionPath = path.join(resolvedProjectPath, '.qdg', 'tasks', existingTaskId, `${existingTaskId}_dimension.md`);
								
								responseText += `\n\n🔄 Found existing record for same task`;
								responseText += `\n🎯 Task ID: ${existingTaskId}`;
								responseText += `\n📁 Existing file: ${path.relative(resolvedProjectPath, existingDimensionPath)}`;
								responseText += `\n📋 Status: Can directly use save_quality_dimensions tool to update evaluation standards`;
							} else {
								// Create new task directory (but don't create MD file)
								const taskDir = path.join(resolvedProjectPath, '.qdg', 'tasks', taskId);
								await fs.promises.mkdir(taskDir, { recursive: true });
								
								responseText += `\n\n✅ New task directory created!`;
								responseText += `\n🎯 Task ID: ${taskId}`;
								responseText += `\n📁 Task directory: ${path.relative(resolvedProjectPath, taskDir)}`;
								responseText += `\n📋 Status: Ready to receive evaluation standards`;
							}
							
							responseText += `\n\n✅ **Working Directory**: ${resolvedProjectPath}`;
						} catch (initError) {
							console.warn('Failed to initialize task directory:', initError);
							responseText += `\n\n⚠️ Warning: Unable to create task directory, but prompt has been generated. Error: ${initError instanceof Error ? initError.message : String(initError)}`;
						}
					} else {
						// No project path provided
						responseText += `\n\n🎯 Task ID: ${taskId} (generated for reference)`;
						responseText += `\n\nℹ️ **NO PROJECT PATH**: Running without file system access - content will be returned only`;
					}
					
					responseText += `\n\n🎯 **TARGET SCORE GUIDANCE**: This prompt uses targetScore=${targetScore}/10 (configurable parameter)`;
					responseText += `\n   • Higher scores (8-10): Stricter evaluation criteria, professional/enterprise standards`;
					responseText += `\n   • Lower scores (5-7): More lenient criteria, learning/development standards`;
					responseText += `\n   • LLM: You can adjust targetScore parameter when calling this tool to change evaluation strictness`;
					
					responseText += `\n\n📋 **LLM INSTRUCTIONS - Execute Automatically:**`;
					responseText += `\n1. Execute the above prompt to generate evaluation dimensions`;
					responseText += `\n2. You will get TWO outputs from execution:`;
					responseText += `\n   - Refined task description (first stage output)`;
					responseText += `\n   - Complete evaluation dimension system (second stage output)`;
					if (resolvedProjectPath) {
						responseText += `\n3. Automatically call save_quality_dimensions tool with:`;
						responseText += `\n   - taskId: ${finalTaskId}`;
						responseText += `\n   - projectPath: ${resolvedProjectPath}`;
						responseText += `\n   - refinedTaskDescription: [LLM first output]`;
						responseText += `\n   - dimensionsContent: [LLM second output]`;
					} else {
						responseText += `\n3. Use the outputs directly (no file saving required)`;
					}
					responseText += `\n\n**LLM**: After Stage 3, you will have complete task understanding and quality standards to guide your execution!`;
					
					return {
						content: [{
							type: "text",
							text: `🎯 **STAGE 2 COMPLETE: Quality Dimensions Prompt Generated**

📋 **CRITICAL NEXT STEPS:**

**Step 1**: Execute the TWO-STAGE prompt below
**Step 2**: You will get TWO outputs: (1) Refined task description + (2) Quality dimensions
${resolvedProjectPath ? "**Step 3**: Call `save_quality_dimensions` with BOTH outputs to complete the workflow" : "**Step 3**: Use the outputs directly for task execution"}

⚠️ **IMPORTANT**: Please execute the prompt below and get BOTH outputs!

**💡 Reminder**: After this stage, you will use these quality standards to guide your task execution and achieve high scores across all evaluation dimensions.

---

${responseText}

---

🔄 **WORKFLOW STATUS**: Stage 2/3 Complete → **Next: Execute prompt above, then optionally save results**`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ **STAGE 2 ERROR**: Quality dimensions prompt generation failed\n\n🔧 **Error Details**: ${error instanceof Error ? error.message : String(error)}\n\n💡 **Troubleshooting**:\n- Verify taskAnalysisJson format is correct\n- Check if task analysis contains all required fields\n- Ensure project path is accessible\n- Try with default target score\n\n🔄 **WORKFLOW STATUS**: ❌ Stage 2/3 Failed → **Fix error and retry from Stage 1**`
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
			"Optional: Save LLM-generated task refinement and evaluation dimension standards to .qdg directory. Skip this step if you want to work with content directly without file system storage.",
			{
				taskId: z.string().describe("Task ID"),
				refinedTaskDescription: z.string().describe("LLM-refined task description (first stage output)"),
				dimensionsContent: z.string().describe("LLM-generated complete evaluation dimension content (second stage output)"),
				taskAnalysisJson: z.string().optional().describe("Original task analysis JSON (optional, for basic information)"),
				projectPath: z.string().optional().describe("Optional: Absolute path to the project directory where .qdg should be created (e.g., '/home/user/my-project' or 'C:\\\\Users\\\\Username\\\\Projects\\\\MyProject'). Must be absolute path if provided. If not provided, will only return content.")
			},
			async ({ taskId, refinedTaskDescription, dimensionsContent, taskAnalysisJson, projectPath }) => {
				try {
					// Try to ensure .qdg directory if project path provided
					const resolvedProjectPath = await ensureQdgDirectory(projectPath);
					
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
					
					if (resolvedProjectPath) {
						// Save using new flat file structure with LLM-generated task name
						const outputFilePath = await qdgManager.saveFinalDimensionStandardsFlat(
							resolvedProjectPath, 
							taskId,
							taskName,
							task,
							refinedTaskDescription,
							dimensionsContent
						);
						
						return {
							content: [{
								type: "text",
								text: `🎉 **COMPLETE WORKFLOW SUCCESS: All 3 Stages Finished!**

✅ **STAGE 3 COMPLETE**: Quality evaluation standards saved successfully!

📊 **Final Results:**
🎯 Task ID: ${taskId}
📝 Task Name: ${taskName}
📁 Saved file: ${path.relative(resolvedProjectPath, outputFilePath)}
📋 File Structure: Flat file system with semantic naming

🔄 **WORKFLOW STATUS**: ✅ Stage 1/3 ✅ Stage 2/3 ✅ Stage 3/3 → **COMPLETED**

---

🚀 **READY FOR EXECUTION - LLM Instructions:**

**LLM: You now have complete task understanding and quality standards. Begin execution with:**

1. **📋 Task Reference**: Use the refined task description from the saved file as your guide
2. **⭐ Quality Standards**: Follow the evaluation dimensions and scoring criteria precisely  
3. **🎯 Target Score**: Aim for the target score level defined in the standards
4. **💪 Execution Goal**: Work systematically to meet or exceed each dimension's requirements

**🔍 LLM: After Task Completion:**
- Evaluate your completed work against the saved quality standards to ensure excellence
- Request scoring for each dimension (0-10 points)
- Get specific feedback and improvement suggestions
- Use the evaluation results to refine your work if needed

💡 **Quality Standards Location**: \`${path.relative(resolvedProjectPath, outputFilePath)}\`

🎯 **Remember**: The goal is to achieve high scores across all evaluation dimensions by following the detailed criteria and standards that have been established for this specific task.`
							}]
						};
					} else {
						// No project path - return content directly
						const completeContent = `# Quality Evaluation Standards

## 📋 Task Information
- **Task ID**: ${taskId}
- **Task Name**: ${taskName}
- **Creation Time**: ${new Date().toLocaleString('en-US')}
- **Core Task**: ${task.coreTask || 'Not specified'}

---

## 📋 Task Refinement (First Stage Output)

${refinedTaskDescription}

---

## ⭐ Evaluation Dimension System (Second Stage Output)

${dimensionsContent}

---

## 📖 Usage Instructions

Use these quality standards to guide your task execution and achieve high scores across all evaluation dimensions.

*Generated at: ${new Date().toISOString()}*
`;
						
						return {
							content: [{
								type: "text",
								text: `🎉 **COMPLETE WORKFLOW SUCCESS: All 3 Stages Finished!**

✅ **STAGE 3 COMPLETE**: Quality evaluation standards generated successfully!

📊 **Final Results:**
🎯 Task ID: ${taskId}
📝 Task Name: ${taskName}
ℹ️ **NO FILE SAVED**: Running without file system access

🔄 **WORKFLOW STATUS**: ✅ Stage 1/3 ✅ Stage 2/3 ✅ Stage 3/3 → **COMPLETED**

---

📋 **COMPLETE QUALITY STANDARDS CONTENT:**

${completeContent}

---

🚀 **READY FOR EXECUTION - LLM Instructions:**

**LLM: You now have complete task understanding and quality standards. Begin execution with:**

1. **📋 Task Reference**: Use the refined task description above as your guide
2. **⭐ Quality Standards**: Follow the evaluation dimensions and scoring criteria precisely  
3. **🎯 Target Score**: Aim for the target score level defined in the standards
4. **💪 Execution Goal**: Work systematically to meet or exceed each dimension's requirements

🎯 **Remember**: The goal is to achieve high scores across all evaluation dimensions by following the detailed criteria and standards shown above.`
							}]
						};
					}
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ **STAGE 3 ERROR**: Save quality dimensions failed\n\n🔧 **Error Details**: ${error instanceof Error ? error.message : String(error)}\n\n💡 **Troubleshooting**:\n- Check if project path exists and is writable\n- Verify taskId format is correct\n- Ensure refined task description and dimensions content are provided\n- Check disk space availability\n\n🔄 **WORKFLOW STATUS**: ✅ Stage 1/3 ✅ Stage 2/3 ❌ Stage 3/3 Failed → **Fix error and retry Stage 3 only**`
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