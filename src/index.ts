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
	ConversationInput,
	validateTaskAnalysis
} from './lib/types.js';
import { TaskExtractor } from './lib/taskExtractor.js';
import { TimeContextManager } from './lib/timeContextManager.js';
import { QualityDimensionGenerator } from './lib/qualityDimensionGenerator.js';
import { QdgDirectoryManager } from './lib/qdgDirectoryManager.js';

/**
 * Quality Dimension Generator MCP Server
 * Focused on generating clear quality evaluation dimensions and standards for tasks
 * 
 * Core Philosophy: Clear Task Definition + Clear Scoring Direction = High Quality Output
 */

// Configuration schema
const configSchema = z.object({
	enabledTools: z.array(z.string()).optional().describe("List of tools to enable"),
	debug: z.boolean().default(false).describe("Enable debug logging"),
	dimensionCount: z.number().default(5).describe("Number of quality dimensions to generate (default: 5)"),
	expectedScore: z.number().default(8).describe("Expected target score for quality evaluation (0-10 scale, default: 8)")
});

// Export configuration for Smithery CLI
export { configSchema };
export const stateless = true;

// Main server function
export default function createServer(config: Partial<z.infer<typeof configSchema>> = {}) {
	// Apply defaults
	const finalConfig = {
		debug: config.debug ?? false,
		enabledTools: config.enabledTools,
		dimensionCount: config.dimensionCount ?? 5,
		expectedScore: config.expectedScore ?? 8
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
	const dimensionGenerator = new QualityDimensionGenerator(finalConfig);
	const qdgManager = new QdgDirectoryManager();

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
		
		// Normalize path separators and handle cross-platform paths
		let resolvedPath = providedPath.replace(/\\/g, '/');
		
		// On Windows, if running in a Unix-like environment (like Docker),
		// we might need to handle Windows paths differently
		if (process.platform === 'win32' || providedPath.match(/^[A-Za-z]:\\/)) {
			// If it's a Windows absolute path but we're in a Unix environment,
			// keep the original path for file system operations
			resolvedPath = providedPath;
		}
		
		console.log(`[QDG] Using project path: ${resolvedPath}`);
		console.log(`[QDG] Platform: ${process.platform}`);
		console.log(`[QDG] Original path: ${providedPath}`);
		
		// Check if path is absolute (cross-platform)
		const isAbsolute = path.isAbsolute(providedPath) || 
						   providedPath.match(/^[A-Za-z]:\\/) || 
						   providedPath.startsWith('/');
		
		if (!isAbsolute) {
			throw new Error(`Project path must be absolute. Provided: ${providedPath}`);
		}
		
		// Try to check if path exists using original format
		try {
			if (!fs.existsSync(providedPath)) {
				throw new Error(`Project path does not exist: ${providedPath}`);
			}
		} catch (fsError) {
			console.warn(`[QDG] File system access failed for: ${providedPath}`, fsError);
			throw new Error(`Project path does not exist or is not accessible: ${providedPath}`);
		}
		
		return providedPath; // Return original path for file operations
	};

	// Helper function to ensure .qdg directory for any tool (skip if no project path)
	const ensureQdgDirectory = async (projectPath?: string): Promise<string | null> => {
		if (!projectPath) {
			return null; // Skip file operations if no path provided
		}
		
		// Use the path as-is, don't resolve it to avoid cross-platform issues
		if (!fs.existsSync(projectPath)) {
			return null; // Path doesn't exist
		}
		
		await qdgManager.initializeQdgDirectory(projectPath);
		return projectPath;
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
							text: `🎯 **STAGE 1 COMPLETE: Task Analysis Prompt Generated**

📋 **LLM INSTRUCTIONS - Execute Automatically:**

**Step 1**: Execute the prompt below to get task analysis JSON
**Step 2**: Call \`generate_quality_dimensions_prompt\` with the JSON and targetScore (1-10 to set evaluation strictness)
**Step 3**: Optionally call \`save_quality_dimensions\` to save standards to .qdg directory (will auto-create directory)

⚠️ **LLM**: Execute the prompt below to get JSON output, then automatically proceed to Stage 2!

**🎯 Purpose**: These stages help you fully understand the task and establish clear quality standards before beginning execution, ensuring higher quality results.

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
			"Generate quality dimensions prompt based on task analysis. Uses default target score from configuration or task complexity to determine evaluation strictness.",
			{
				taskAnalysisJson: z.string().describe("Task analysis JSON result")
			},
			async ({ taskAnalysisJson }) => {
				try {
					// Parse task analysis JSON (already validated in stage 1)
					const task: TaskAnalysis = JSON.parse(taskAnalysisJson);
					
					// Use default expected score from configuration
					const targetScore = finalConfig.expectedScore;
					
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
					
					// Get time context (use system defaults)
					const timeContext = timeContextManager.getCurrentTimeContext();
					
					
					const prompt = await dimensionGenerator.generateDimensionsPrompt(task, timeContext);
					
					return {
						content: [{
							type: "text",
							text: `🎯 **STAGE 2 COMPLETE: Quality Dimensions Prompt Generated**

📋 **LLM INSTRUCTIONS - Execute Automatically:**

**Step 1**: ✅ Task analysis complete
**Step 2**: ✅ Quality dimensions prompt ready below
**Step 3**: Call \`save_quality_dimensions\` to save standards to .qdg directory (optional - will auto-create project structure)

⚠️ **LLM**: Execute the prompt below to generate quality dimensions, then optionally proceed to Stage 3!

**🎯 Purpose**: This prompt will generate comprehensive quality evaluation standards tailored to your specific task requirements.

---

## 📝 Quality Dimensions Prompt:

${prompt}

---

� **TASK METADATA** (for optional Stage 3):
- **Task ID**: ${taskId}
- **Task Analysis**: ${taskAnalysisJson}

🔄 **WORKFLOW STATUS**: Stage 2/3 Complete → **Next: Execute the above prompt for dimensions**`
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
			"Save LLM-generated task refinement and evaluation dimension standards to .qdg directory. LLM must provide absolute path to target directory.",
			{
				taskId: z.string().describe("Task ID"),
				taskName: z.string().describe("Task name"),
				refinedTaskDescription: z.string().describe("LLM-refined task description (first stage output)"),
				dimensionsContent: z.string().describe("LLM-generated complete evaluation dimension content (second stage output)"),
				projectPath: z.string().describe("REQUIRED: Absolute path to the project directory where .qdg should be created (e.g., 'C:\\\\Users\\\\Username\\\\Projects\\\\MyProject' or '/home/user/my-project'). LLM must determine and provide appropriate absolute path.")
			},
			async ({ taskId, taskName, refinedTaskDescription, dimensionsContent, projectPath }) => {
				try {
					// Ensure .qdg directory at the specified absolute path
					const resolvedProjectPath = await ensureQdgDirectory(projectPath);
					
					if (!resolvedProjectPath) {
						throw new Error(`Failed to initialize .qdg directory at: ${projectPath}`);
					}
					
					if (resolvedProjectPath) {
						// Save using new flat file structure with provided task name
						const outputFilePath = await qdgManager.saveFinalDimensionStandardsFlat(
							resolvedProjectPath, 
							taskId,
							taskName,
							{}, // Empty task object since we don't need taskAnalysisJson anymore
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