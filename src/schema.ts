import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Quality Dimension Generator - 工具Schema定义
 * 用于LLM理解和调用质量评价工具的标准接口
 */

/**
 * 任务分析提示词生成工具
 */
export const TASK_ANALYSIS_PROMPT_TOOL: Tool = {
	name: 'generate_task_analysis_prompt',
	description: '生成任务分析提示词，让LLM分析用户对话中的核心任务',
	inputSchema: {
		type: 'object',
		properties: {
			userMessage: {
				type: 'string',
				description: '用户消息内容'
			},
			conversationHistory: {
				type: 'array',
				description: '对话历史记录（可选）',
				items: {
					type: 'object',
					properties: {
						role: {
							type: 'string',
							enum: ['user', 'assistant'],
							description: '消息角色'
						},
						content: {
							type: 'string',
							description: '消息内容'
						},
						timestamp: {
							type: 'number',
							description: '消息时间戳（可选）'
						}
					},
					required: ['role', 'content']
				}
			},
			context: {
				type: 'object',
				description: '额外上下文信息（可选）',
				additionalProperties: true
			}
		},
		required: ['userMessage']
	}
};

/**
 * 质量维度生成工具 - 支持可配置维度数量和6-8-10评分指导系统
 */
export const QUALITY_DIMENSIONS_TOOL: Tool = {
	name: 'generate_quality_dimensions_prompt',
	description: '生成质量维度提示词，让LLM根据任务和时间背景生成专业评价维度。自动开始任务追踪。',
	inputSchema: {
		type: 'object',
		properties: {
			taskAnalysisJson: {
				type: 'string',
				description: '任务分析的JSON结果'
			},
			timezone: {
				type: 'string',
				description: '时区（可选）'
			},
			locale: {
				type: 'string',
				description: '本地化设置',
				default: 'zh-CN'
			},
			projectPath: {
				type: 'string',
				description: '项目路径（可选，用于任务追踪）'
			},
			includePatterns: {
				type: 'array',
				items: { type: 'string' },
				description: '要追踪的文件模式',
				default: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx", "**/*.json", "**/*.md", "**/*.yml", "**/*.yaml"]
			},
			excludePatterns: {
				type: 'array',
				items: { type: 'string' },
				description: '要排除的文件模式',
				default: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**"]
			}
		},
		required: ['taskAnalysisJson']
	}
};

/**
 * 任务评价提示词生成工具 - 简化版（不需循环改进）
 */
export const TASK_EVALUATION_PROMPT_TOOL: Tool = {
	name: 'generate_task_evaluation_prompt',
	description: '完成任务评价，检测变更并生成基于变更的评价提示词',
	inputSchema: {
		type: 'object',
		properties: {
			taskId: {
				type: 'string',
				description: '任务ID（从start_task_tracking或generate_quality_dimensions_prompt获得）'
			},
			evaluationDimensionsJson: {
				type: 'string',
				description: '评价维度的JSON数组'
			},
			originalTask: {
				type: 'string',
				description: '原始任务描述（可选，会覆盖跟踪时的任务描述）'
			}
		},
		required: ['taskId', 'evaluationDimensionsJson']
	}
};

/**
 * 任务跟踪工具
 */
export const TASK_TRACKING_TOOL: Tool = {
	name: 'start_task_tracking',
	description: '开始任务跟踪，记录当前项目状态作为基准',
	inputSchema: {
		type: 'object',
		properties: {
			taskDescription: {
				type: 'string',
				description: '任务描述'
			},
			projectPath: {
				type: 'string',
				description: '项目路径'
			},
			includePatterns: {
				type: 'array',
				items: { type: 'string' },
				description: '要监控的文件模式',
				default: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx", "**/*.json", "**/*.md", "**/*.yml", "**/*.yaml"]
			},
			excludePatterns: {
				type: 'array',
				items: { type: 'string' },
				description: '要排除的文件模式',
				default: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**", "**/tmp/**"]
			}
		},
		required: ['taskDescription', 'projectPath']
	}
};

/**
 * 时间上下文工具
 */
export const TIME_CONTEXT_TOOL: Tool = {
	name: 'get_current_time_context',
	description: '获取当前基本的时间上下文信息（不含主观判断）',
	inputSchema: {
		type: 'object',
		properties: {
			timezone: {
				type: 'string',
				description: '时区（可选）'
			},
			locale: {
				type: 'string',
				description: '本地化设置',
				default: 'zh-CN'
			}
		}
	}
};

// 注意：以下工具已在简化版本中移除：
// - generate_improvement_prompt：已移除，不再支持循环改进
// - generate_iterative_improvement_prompt：已移除，不再支持循环改进