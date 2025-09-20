import { TaskAnalysis, ConversationInput } from './types.js';

/**
 * 任务提炼器类 - 纯prompt方式
 * 只生成让LLM分析任务的提示词，不做任何主观判断
 */
export class TaskExtractor {
	
	/**
	 * 生成任务分析提示词
	 * 让LLM自己分析任务并输出结构化结果
	 */
	public generateTaskAnalysisPrompt(input: ConversationInput): string {
		const { userMessage, conversationHistory = [] } = input;
		
		const context = this.buildAnalysisContext(userMessage, conversationHistory);
		
		return `请基于以下对话内容分析用户的核心任务：

对话内容：
${context.rawText}

请按以下维度进行分析并输出JSON格式结果：

\`\`\`json
{
  "coreTask": "用户的核心任务描述",
  "taskType": "任务类型（如：开发、设计、分析、学习、管理、咨询等）",
  "complexity": 复杂度等级(1-5),
  "domain": "任务领域（如：技术开发、商业管理、教育培训等）",
  "keyElements": ["关键要素1", "关键要素2", "关键要素3"],
  "objectives": ["主要目标1", "主要目标2", "主要目标3"]
}
\`\`\`

分析要求：
1. 核心任务：提炼用户的主要需求和期望目标
2. 任务类型：根据任务性质进行分类
3. 复杂度：1=简单 2=较简单 3=中等 4=较复杂 5=复杂
4. 领域：识别任务所属的专业领域
5. 关键要素：识别重要的约束条件、技术要求、标准要求等
6. 目标：分解出具体的、可衡量的目标

请确保分析准确、具体、实用。`;
	}

	/**
	 * 解析LLM返回的任务分析结果
	 */
	public parseTaskAnalysisResult(llmResponse: string): TaskAnalysis {
		// 提取JSON部分
		const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
		if (!jsonMatch) {
			throw new Error('未找到JSON格式的分析结果');
		}

		const result = JSON.parse(jsonMatch[1]);
		
		// 验证必需字段
		if (!result.coreTask || !result.taskType || !result.domain) {
			throw new Error('分析结果缺少必需字段');
		}

		return {
			coreTask: result.coreTask,
			taskType: result.taskType,
			complexity: result.complexity || 3,
			domain: result.domain,
			keyElements: Array.isArray(result.keyElements) ? result.keyElements : [],
			objectives: Array.isArray(result.objectives) ? result.objectives : []
		};
	}

	/**
	 * 构建分析上下文
	 */
	private buildAnalysisContext(userMessage: string, conversationHistory: Array<{role: string, content: string}>) {
		return {
			rawText: [
				...conversationHistory.map(h => `${h.role}: ${h.content}`),
				`user: ${userMessage}`
			].join('\n'),
			messageCount: conversationHistory.length + 1,
			totalLength: userMessage.length + conversationHistory.reduce((sum, h) => sum + h.content.length, 0)
		};
	}
}