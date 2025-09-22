import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Quality Dimension Generator - Tool Schema Definitions
 * Standard interface for LLMs to understand and call quality evaluation tools
 * 
 * Core 3-Step Workflow:
 * 1. TASK_ANALYSIS_PROMPT_TOOL         - Analyze user task and generate analysis prompt
 * 2. QUALITY_DIMENSIONS_PROMPT_TOOL    - Generate quality evaluation standards prompt
 * 3. SAVE_QUALITY_DIMENSIONS_TOOL      - Save LLM-generated task refinement and evaluation dimensions
 * 
 * Purpose: Let LLM fully understand tasks and establish clear quality standards before execution
 */

/**
 * Task analysis prompt generation tool
 * Generates structured prompts for LLM to analyze user tasks automatically
 */
export const TASK_ANALYSIS_PROMPT_TOOL: Tool = {
	name: 'generate_task_analysis_prompt',
	description: 'Generate task analysis prompt for LLM to analyze core tasks in user conversations',
	inputSchema: {
		type: 'object',
		properties: {
			userMessage: {
				type: 'string',
				description: 'User message content'
			},
			conversationHistory: {
				type: 'array',
				description: 'Conversation history records',
				items: {
					type: 'object',
					properties: {
						role: {
							type: 'string',
							enum: ['user', 'assistant'],
							description: 'Message role'
						},
						content: {
							type: 'string',
							description: 'Message content'
						},
						timestamp: {
							type: 'number',
							description: 'Message timestamp (optional)'
						}
					},
					required: ['role', 'content']
				}
			},
			context: {
				type: 'object',
				description: 'Additional context information',
				additionalProperties: true
			}
		},
		required: ['userMessage']
	}
};

/**
 * Quality dimension prompt generator tool
 * Creates comprehensive evaluation frameworks and task records with automatic .qdg directory setup
 */
export const QUALITY_DIMENSIONS_PROMPT_TOOL: Tool = {
	name: 'generate_quality_dimensions_prompt',
	description: 'Generate quality dimensions prompt and create task records. Use targetScore (8 default) to set evaluation strictness: higher scores create stricter professional standards, lower scores create more lenient learning-focused criteria.',
	inputSchema: {
		type: 'object',
		properties: {
			taskAnalysisJson: {
				type: 'string',
				description: 'Task analysis JSON result'
			},
			targetScore: {
				type: 'number',
				description: 'Target score (0-10 scale, used to guide evaluation criteria strictness)',
				default: 8
			},
			timezone: {
				type: 'string',
				description: 'Timezone'
			},
			locale: {
				type: 'string',
				description: 'Localization settings',
				default: 'en-US'
			},
			projectPath: {
				type: 'string',
				description: 'Project path (optional, for saving task records)'
			}
		},
		required: ['taskAnalysisJson']
	}
};

/**
 * Quality dimension save tool
 * Save LLM-generated task refinement and evaluation dimensions with flat file structure
 */
export const SAVE_QUALITY_DIMENSIONS_TOOL: Tool = {
	name: 'save_quality_dimensions',
	description: 'Save LLM-generated task refinement and evaluation dimension standards to .qdg directory',
	inputSchema: {
		type: 'object',
		properties: {
			taskId: {
				type: 'string',
				description: 'Task ID'
			},
			projectPath: {
				type: 'string',
				description: 'Project path'
			},
			refinedTaskDescription: {
				type: 'string',
				description: 'LLM-refined task description (first stage output)'
			},
			dimensionsContent: {
				type: 'string',
				description: 'LLM-generated complete evaluation dimension content (second stage output)'
			},
			taskAnalysisJson: {
				type: 'string',
				description: 'Original task analysis JSON (optional, for basic information)'
			}
		},
		required: ['taskId', 'projectPath', 'refinedTaskDescription', 'dimensionsContent']
	}
};

/**
 * All available tools - Core 3-step workflow only
 */
export const ALL_TOOLS = [
	TASK_ANALYSIS_PROMPT_TOOL,         // Step 1: Analyze task
	QUALITY_DIMENSIONS_PROMPT_TOOL,    // Step 2: Generate quality standards
	SAVE_QUALITY_DIMENSIONS_TOOL       // Step 3: Save LLM output
] as const;

/**
 * Core workflow tools (same as ALL_TOOLS since we only expose 3 core tools)
 */
export const CORE_WORKFLOW_TOOLS = ALL_TOOLS;