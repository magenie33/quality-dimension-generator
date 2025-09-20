/**
 * 评价维度 (原有接口，保持兼容性)
 */
export interface EvaluationDimension {
	/** 维度名称 */
	name: string;
	/** 维度权重 (0-1) */
	weight: number;
	/** 维度描述 */
	description: string;
	/** 评价标准 */
	criteria: string[];
	/** 评价方法 */
	evaluationMethod?: string;
	/** 重要性说明 */
	importance?: string;
}

/**
 * 评价维度定义 - 简化版
 * 支持0-2分，5档次评分 (0, 0.5, 1, 1.5, 2)
 */
export interface EvaluationDimension {
	/** 维度名称 */
	name: string;
	/** 维度权重 (每个维度0.2，总计5个维度) */
	weight: number;
	/** 维度描述 */
	description: string;
	/** 评分标准 (5档次: 2.0分、1.5分、1.0分、0.5分、0.0分) */
	criteria: string[];
	/** 评价方法 (0-2分制评分，5档次) */
	evaluationMethod?: string;
	/** 重要性说明 */
	importance?: string;
}

/**
 * 任务分析结果
 */
export interface TaskAnalysis {
	/** 提炼出的核心任务 */
	coreTask: string;
	/** 任务类型 */
	taskType: string;
	/** 任务复杂度 (1-5) */
	complexity: number;
	/** 任务领域 */
	domain: string;
	/** 关键要素 */
	keyElements: string[];
	/** 任务目标 */
	objectives: string[];
}

/**
 * 时间上下文信息
 */
export interface TimeContext {
	/** 当前时间戳 */
	timestamp: number;
	/** 格式化的时间字符串 */
	formattedTime: string;
	/** 时区信息 */
	timezone: string;
	/** 年份 */
	year: number;
	/** 月份 */
	month: number;
	/** 日期 */
	day: number;
	/** 星期几 */
	weekday: string;
}

/**
 * 质量评价结果
 */
export interface QualityEvaluationResult {
	/** 分析的任务 */
	task: TaskAnalysis;
	/** 时间上下文 */
	timeContext: TimeContext;
	/** 生成的评价维度 */
	evaluationDimensions: EvaluationDimension[];
	/** 生成时间 */
	generatedAt: string;
	/** 评价框架版本 */
	frameworkVersion: string;
}

/**
 * 对话分析输入
 */
export interface ConversationInput {
	/** 用户消息 */
	userMessage: string;
	/** 对话历史 (可选) */
	conversationHistory?: Array<{
		role: 'user' | 'assistant';
		content: string;
		timestamp?: number;
	}>;
	/** 上下文信息 (可选) */
	context?: Record<string, unknown>;
}

/**
 * 工具调用参数
 */
export interface GenerateEvaluationParams {
	/** 对话输入 */
	conversation: ConversationInput;
	/** 是否包含详细分析 */
	includeDetailedAnalysis?: boolean;
	/** 自定义评价框架 */
	customFramework?: string;
	/** 特定领域偏好 */
	domainPreference?: string;
}

/**
 * 项目文件信息
 */
export interface ProjectFile {
	/** 相对路径 */
	relativePath: string;
	/** 完整路径 */
	fullPath: string;
	/** 文件内容 */
	content: string;
	/** 文件大小（字符数） */
	size: number;
	/** 文件扩展名 */
	extension: string;
	/** 行数 */
	lines: number;
}

/**
 * 综合项目数据
 */
export interface ProjectData {
	/** 项目文件列表 */
	files: ProjectFile[];
	/** 项目目录结构 */
	structure: string;
	/** 文件总数 */
	fileCount: number;
	/** 总大小（字符数） */
	totalSize: number;
	/** 总行数 */
	totalLines: number;
}

/**
 * 维度评分结果
 */
export interface DimensionScore {
	/** 维度名称 */
	dimensionName: string;
	/** 评分 (0-100) */
	score: number;
	/** 评分等级 */
	grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
	/** 评分理由 */
	reason: string;
	/** 具体表现分析 */
	performanceAnalysis: string;
	/** 改进建议 */
	improvementSuggestions: string[];
	/** 参考标准 */
	benchmarkComparison?: string;
}



/**
 * 任务评估输入参数
 */
export interface EvaluateTaskParams {
	/** 原始任务描述 */
	originalTask: string;
	/** LLM完成的工作内容 */
	completedWork: string;
	/** 之前生成的评价框架 */
	evaluationFramework?: QualityEvaluationResult;
	/** 或者重新生成评价框架的参数 */
	generateFramework?: {
		conversation: ConversationInput;
		domainPreference?: string;
		customFramework?: string;
	};
	/** 评估配置 */
	evaluationConfig?: {
		strictness: 'lenient' | 'standard' | 'strict';
		focusAreas?: string[];
		includeActionPlan: boolean;
		detailLevel: 'basic' | 'standard' | 'comprehensive';
	};
}

/**
 * 第二个功能：评分输入参数
 */
export interface EvaluateTaskParams2 {
	/** 原始评价维度（从第一个功能获得） */
	evaluationDimensions: EvaluationDimension[];
	/** LLM完成的任务内容 */
	completedTask: {
		/** 任务内容或输出 */
		content: string;
		/** 原始任务描述（可选） */
		originalTask?: string;
		/** 任务类型 */
		taskType?: string;
		/** 完成时间 */
		completedAt?: string;
		/** 额外的上下文信息 */
		context?: Record<string, unknown>;
	};
	/** 评分标准（0-10分制，5维度×2分） */
	scaleType?: '0-10-simplified';
	/** 是否提供详细的改进建议 */
	includeImprovementSuggestions?: boolean;
}

/**
 * 单个维度的评分结果
 */
export interface DimensionScore {
	/** 维度名称 */
	dimensionName: string;
	/** 评分（根据scaleType） */
	score: number;
	/** 最大分数 */
	maxScore: number;
	/** 置信度 (0-1) */
	confidence: number;
	/** 评分理由 */
	reason: string;
	/** 表现亮点 */
	strengths: string[];
	/** 改进点 */
	weaknesses: string[];
	/** 具体改进建议 */
	improvementSuggestions: string[];
	/** 是否达到及格线 */
	isAcceptable: boolean;
	/** 分析详情 */
	analysisDetails: {
		criteriaMatched: number;
		totalCriteria: number;
		keyStrengths: string[];
		keyWeaknesses: string[];
	};
}

/**
 * 综合评价结果（第二个功能的输出）
 */
export interface TaskEvaluationResult {
	/** 任务基本信息 */
	taskInfo: {
		originalTask: string;
		completedContent: string;
		evaluatedAt: string;
		scaleType: '1-5' | '1-10';
	};
	/** 各维度评分 */
	dimensionScores: DimensionScore[];
	/** 综合评分统计 */
	overallScore: {
		/** 加权总分 */
		totalScore: number;
		/** 最大可能分数 */
		maxPossibleScore: number;
		/** 百分比得分 */
		percentageScore: number;
		/** 等级评价 */
		grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
		/** 是否通过 */
		passed: boolean;
	};
	/** 综合分析 */
	analysis: {
		/** 主要优势 */
		mainStrengths: string[];
		/** 主要问题 */
		mainWeaknesses: string[];
		/** 优先改进建议 */
		prioritySuggestions: string[];
		/** 下一步行动建议 */
		nextActions: string[];
	};
	/** 评价框架版本 */
	frameworkVersion: string;
}