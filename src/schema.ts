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
 * 质量维度提示词生成工具
 */
export const QUALITY_DIMENSIONS_PROMPT_TOOL: Tool = {
	name: 'generate_quality_dimensions_prompt',
	description: '生成质量维度提示词并创建任务记录，让LLM根据任务生成专业评价维度',
	inputSchema: {
		type: 'object',
		properties: {
			taskAnalysisJson: {
				type: 'string',
				description: '任务分析的JSON结果'
			},
			targetScore: {
				type: 'number',
				description: '目标分数（0-10分制，用于指导评价标准的严格程度）',
				default: 8
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
				description: '项目路径（可选，用于保存任务记录）'
			}
		},
		required: ['taskAnalysisJson']
	}
};

/**
 * 质量维度保存工具 - 保存LLM的双输出结果
 */
export const SAVE_QUALITY_DIMENSIONS_TOOL: Tool = {
	name: 'save_quality_dimensions',
	description: '保存LLM生成的任务提炼和评价维度标准到.qdg目录',
	inputSchema: {
		type: 'object',
		properties: {
			taskId: {
				type: 'string',
				description: '任务ID'
			},
			projectPath: {
				type: 'string',
				description: '项目路径'
			},
			refinedTaskDescription: {
				type: 'string',
				description: 'LLM提炼后的任务描述（第一个环节的output）'
			},
			dimensionsContent: {
				type: 'string',
				description: 'LLM生成的完整评价维度内容（第二个环节的output）'
			},
			taskAnalysisJson: {
				type: 'string',
				description: '原始任务分析JSON（可选，用于基础信息）'
			}
		},
		required: ['taskId', 'projectPath', 'refinedTaskDescription', 'dimensionsContent']
	}
};

/**
 * 时间上下文工具
 */
export const TIME_CONTEXT_TOOL: Tool = {
	name: 'get_current_time_context',
	description: '获取当前基本的时间上下文信息（自动检测系统时区）',
	inputSchema: {
		type: 'object',
		properties: {
			timezone: {
				type: 'string',
				description: '时区（可选，不指定则自动检测系统时区）'
			},
			locale: {
				type: 'string',
				description: '本地化设置',
				default: 'zh-CN'
			}
		}
	}
};

/**
 * 诊断工作目录工具
 */
export const DIAGNOSE_WORKING_DIRECTORY_TOOL: Tool = {
	name: 'diagnose_working_directory',
	description: '诊断当前工作目录和MCP服务器运行环境，帮助解决路径相关问题',
	inputSchema: {
		type: 'object',
		properties: {}
	}
};

/**
 * 工具导出 - 按使用频率排序
 */
export const ALL_TOOLS = [
	TASK_ANALYSIS_PROMPT_TOOL,         // 第1步：分析任务
	QUALITY_DIMENSIONS_PROMPT_TOOL,    // 第2步：生成提示词
	SAVE_QUALITY_DIMENSIONS_TOOL,      // 第3步：保存LLM输出
	TIME_CONTEXT_TOOL,                 // 辅助：时间上下文
	DIAGNOSE_WORKING_DIRECTORY_TOOL    // 辅助：诊断工具
] as const;

/**
 * 核心工作流程工具（推荐使用顺序）
 */
export const CORE_WORKFLOW_TOOLS = [
	TASK_ANALYSIS_PROMPT_TOOL,
	QUALITY_DIMENSIONS_PROMPT_TOOL,
	SAVE_QUALITY_DIMENSIONS_TOOL
] as const;