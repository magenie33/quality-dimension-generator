#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { 
	TaskAnalysis,
	TimeContext,
	ConversationInput
} from './lib/types.js';
import { TaskExtractor } from './lib/taskExtractor.js';
import { TimeContextManager } from './lib/timeContextManager.js';
import { QualityDimensionGenerator } from './lib/qualityDimensionGenerator.js';

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
							text: `🎯 **Stage 1/2: Task Analysis Complete**

Execute the prompt below to get task analysis JSON, then call \`generate_quality_dimensions_prompt\` with the result.

${prompt}`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ Stage 1 Error: ${error instanceof Error ? error.message : String(error)}`
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
					
					// Get time context (use system defaults)
					const timeContext = timeContextManager.getCurrentTimeContext();
					
					const prompt = await dimensionGenerator.generateDimensionsPrompt(task, timeContext);
					
					return {
						content: [{
							type: "text",
							text: `✅ **Stage 2/2: Quality Standards Complete**

Execute the prompt below to get quality evaluation standards (expectedScore: ${targetScore}/10):

${prompt}

🚀 **Task Execution**: Now use the task definition, quality evaluation standards, and target score (${targetScore}/10) to complete your work with high quality.

📊 **After Completion**: Evaluate your work against each quality dimension and provide scores to ensure you meet the ${targetScore}/10 target.`
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `❌ Stage 2 Error: ${error instanceof Error ? error.message : String(error)}`
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