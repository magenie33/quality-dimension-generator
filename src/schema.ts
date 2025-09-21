import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Quality Dimension Generator - Tool Schema Definitions
 * Standard interface for LLMs t	TASK_ANALYSIS_PROMPT_TOOL,         // Step 1: Analyze task
	QUALITY_DIMENSIONS_PROMPT_TOOL,    // Step 2: Generate prompts
	SAVE_QUALITY_DIMENSIONS_TOOL,      // Step 3: Save LLM output
	TIME_CONTEXT_TOOL,                 // Helper: Time context
	DIAGNOSE_WORKING_DIRECTORY_TOOL    // Helper: Directory diagnosiserstand and call quality evaluation tools
 */

/**
 * Task analysis prompt generation tool
 */
export const TASK_ANALYSIS_PROMPT_TOOL: Tool = {
	name: 'generate_task_analysis_prompt',
	description: 'Generate task analysis prompt to help LLM analyze core tasks in user conversations',
	inputSchema: {
		type: 'object',
		properties: {
			userMessage: {
				type: 'string',
				description: 'User message content'
			},
			conversationHistory: {
				type: 'array',
				description: 'Conversation history (optional)',
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
				description: 'Additional context information (optional)',
				additionalProperties: true
			}
		},
		required: ['userMessage']
	}
};

/**
 * Quality dimension prompt generator tool
 */
export const QUALITY_DIMENSIONS_PROMPT_TOOL: Tool = {
	name: 'generate_quality_dimensions_prompt',
	description: 'Generate quality dimension prompts and create task records, allowing LLMs to generate professional evaluation dimensions based on tasks',
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
				description: 'Timezone (optional)'
			},
			locale: {
				type: 'string',
				description: 'Localization settings',
				default: 'zh-CN'
			},
			projectPath: {
				type: 'string',
				description: 'Project path (optional, used to save task records)'
			}
		},
		required: ['taskAnalysisJson']
	}
};

/**
 * Quality dimension save tool - Save LLM dual-output results
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
 * Time context tool
 */
export const TIME_CONTEXT_TOOL: Tool = {
	name: 'get_current_time_context',
	description: 'Get current basic time context information (auto-detect system timezone)',
	inputSchema: {
		type: 'object',
		properties: {
			timezone: {
				type: 'string',
				description: 'Timezone (optional, auto-detect system timezone if not specified)'
			},
			locale: {
				type: 'string',
				description: 'Localization settings',
				default: 'zh-CN'
			}
		}
	}
};

/**
 * Working directory diagnosis tool
 */
export const DIAGNOSE_WORKING_DIRECTORY_TOOL: Tool = {
	name: 'diagnose_working_directory',
	description: 'Diagnose current working directory and MCP server runtime environment, help resolve path-related issues',
	inputSchema: {
		type: 'object',
		properties: {}
	}
};

/**
 * Tool exports - ordered by usage frequency
 */
export const ALL_TOOLS = [
	TASK_ANALYSIS_PROMPT_TOOL,         // Step 1: Analyze task
	QUALITY_DIMENSIONS_PROMPT_TOOL,    // Step 2: Generate prompts
	SAVE_QUALITY_DIMENSIONS_TOOL,      // Step 3: Save LLM output
	TIME_CONTEXT_TOOL,                 // Helper: Time context
	DIAGNOSE_WORKING_DIRECTORY_TOOL    // Helper: Directory diagnosis
] as const;

/**
 * Core workflow tools (recommended usage order)
 */
export const CORE_WORKFLOW_TOOLS = [
	TASK_ANALYSIS_PROMPT_TOOL,
	QUALITY_DIMENSIONS_PROMPT_TOOL,
	SAVE_QUALITY_DIMENSIONS_TOOL
] as const;