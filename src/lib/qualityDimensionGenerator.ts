import { EvaluationDimension, TaskAnalysis, TimeContext } from './types.js';
import { ConfigManager } from './configManager.js';

/**
 * 质量评价维度生成器
 * 支持配置化维度数量和期望分数，每个维度可给0-10分任意数字，最终取均分
 * 注意：3档次说明（6、8、10分）仅为指导，实际评分可以是0-10任意数字
 */
export class QualityDimensionGenerator {
	private configManager: ConfigManager;
	
	constructor() {
		this.configManager = new ConfigManager();
	}
	
	/**
	 * 生成维度评分提示词，支持配置化维度数量和期望分数
	 */
	public async generateDimensionsPrompt(
		task: TaskAnalysis,
		timeContext: TimeContext,
		projectPath?: string,
		targetScore?: number
	): Promise<string> {
		// 获取配置
		const dimensionCount = projectPath 
			? await this.configManager.getDimensionCount(projectPath)
			: 5; // 默认5个维度
			
		const expectedScore = targetScore ?? (projectPath 
			? await this.configManager.getExpectedScore(projectPath)
			: 8); // 默认期望8分

		return `请根据以下任务信息，生成${dimensionCount}个评价维度的完整评分标准：

## 任务信息
- 核心任务：${task.coreTask}
- 任务类型：${task.taskType}
- 复杂度：${task.complexity}/5
- 领域：${task.domain}
- 关键要素：${task.keyElements.join(', ')}
- 目标：${task.objectives.join(', ')}

## 时间背景
- 当前时间：${timeContext.formattedTime}
- 年份：${timeContext.year}年${timeContext.month}月

## 🎯 目标设定
- **期望达到的分数**: ${expectedScore}/10分
- **评分严格程度**: ${expectedScore >= 8 ? '高标准（严格评价）' : expectedScore >= 6 ? '中等标准（适中评价）' : '基础标准（宽松评价）'}
- **质量要求**: ${expectedScore >= 8 ? '追求卓越，细节完美' : expectedScore >= 6 ? '良好质量，主要功能完备' : '基本可用，满足基础需求'}

## 评分体系要求
- **总分**：10分（所有维度均分）
- **维度数量**：${dimensionCount}个维度
- **每个维度**：0-10分（**可以是任意小数，如7.5、8.2等**）
- **评分指导**：提供3个档次说明（6分、8分、10分）作为参考
- **最终分数**：所有维度得分的平均值

## 输出格式要求

请按以下格式生成${dimensionCount}个维度：

### 维度1：[维度名称] (0-10分)
**描述**：[维度的整体描述和评价范围]
**重要性**：[为什么这个维度重要]
**评分指导**：
- **10分**：[卓越表现的标准]
- **8分**：[优秀表现的标准]
- **6分**：[及格表现的标准]

### 维度2：[维度名称] (0-10分)
**描述**：[维度的整体描述和评价范围]
**重要性**：[为什么这个维度重要]
**评分指导**：
- **10分**：[卓越表现的标准]
- **8分**：[优秀表现的标准]
- **6分**：[及格表现的标准]

[重复${dimensionCount}个维度]

## 设计原则
1. **完整覆盖**：${dimensionCount}个维度覆盖任务的所有重要方面
2. **指导明确**：6分、8分、10分的指导说明清晰可辨
3. **灵活评分**：实际评分可以是0-10任意数字（包括小数）
4. **专业性**：符合${timeContext.year}年${task.domain}领域的专业标准
5. **可操作**：评分指导具体、可测量、易于判断
6. **均衡权重**：每个维度同等重要，最终取均分
7. **目标导向**：评分标准应该与${expectedScore}/10分的目标相匹配

请确保生成的评分标准专业、准确、可操作，能够支持后续的精确评分！

## 注意事项
- **评分灵活性**：实际评分时可以给0-10任意数字（如6.5、7.8、8.3等）
- **三档次作用**：6分（及格）、8分（优秀）、10分（卓越）只是指导说明，帮助建立评分感知
- **标准明确**：每个维度的评分指导要具体明确
- **目标匹配**：评分标准的严格程度应该与期望分数${expectedScore}/10分相符合
- **最终分数**：所有${dimensionCount}个维度得分的平均值就是最终分数`;
	}

	/**
	 * 创建维度模板，支持配置化数量
	 */
	public createDimensions(dimensionCount: number = 5): EvaluationDimension[] {
		return Array.from({ length: dimensionCount }, (_, index) => ({
			name: `维度${index + 1}`,
			weight: 1 / dimensionCount, // 动态计算权重
			description: '待LLM生成详细描述',
			criteria: [
				'10分：卓越表现',
				'8分：优秀表现',
				'6分：及格表现'
			],
			evaluationMethod: '0-10分制评分 (可以是任意数字)',
			importance: '待LLM生成重要性说明'
		}));
	}

	/**
	 * 解析LLM生成的维度评分文本（3档次指导）
	 */
	public parseDimensionsFromText(dimensionsText: string, dimensionCount: number = 5): EvaluationDimension[] {
		const dimensions: EvaluationDimension[] = [];
		
		// 按维度分割文本
		const dimensionBlocks = dimensionsText.split(/### 维度\d+：/).slice(1);

		for (let i = 0; i < Math.min(dimensionBlocks.length, dimensionCount); i++) {
			const block = dimensionBlocks[i].trim();
			const lines = block.split('\n').map(line => line.trim()).filter(line => line);
			
			// 解析维度信息
			const dimension: EvaluationDimension = {
				name: '',
				weight: 1 / dimensionCount,
				description: '',
				criteria: [],
				evaluationMethod: '0-10分制评分 (可以是任意数字)',
				importance: ''
			};

			// 解析维度名称
			const firstLine = lines[0] || '';
			const nameMatch = firstLine.match(/^(.+?)\s*\(0-10分\)/);
			if (nameMatch) {
				dimension.name = nameMatch[1].trim();
			}

			// 解析描述和重要性
			for (const line of lines) {
				if (line.startsWith('**描述**：')) {
					dimension.description = line.substring(6).trim();
				} else if (line.startsWith('**重要性**：')) {
					dimension.importance = line.substring(7).trim();
				}
			}

			// 解析评分指导 (3个档次: 6分、8分、10分)
			const criteria: string[] = [];
			const tenPointMatch = block.match(/- \*\*10分\*\*：(.+?)$/m);
			const eightPointMatch = block.match(/- \*\*8分\*\*：(.+?)$/m);
			const sixPointMatch = block.match(/- \*\*6分\*\*：(.+?)$/m);

			if (tenPointMatch) criteria.push(`10分：${tenPointMatch[1].trim()}`);
			if (eightPointMatch) criteria.push(`8分：${eightPointMatch[1].trim()}`);
			if (sixPointMatch) criteria.push(`6分：${sixPointMatch[1].trim()}`);

			dimension.criteria = criteria.length > 0 ? criteria : [
				'10分：卓越表现',
				'8分：优秀表现',
				'6分：及格表现'
			];

			// 设置默认名称
			if (!dimension.name) {
				dimension.name = `维度${i + 1}`;
			}

			dimensions.push(dimension);
		}

		// 确保有指定数量的维度
		while (dimensions.length < dimensionCount) {
			const defaultDimension = this.createDimensions(1)[0];
			defaultDimension.name = `维度${dimensions.length + 1}`;
			defaultDimension.weight = 1 / dimensionCount;
			dimensions.push(defaultDimension);
		}

		return dimensions.slice(0, dimensionCount);
	}

	/**
	 * 生成评分标准表格（支持配置化维度数量）
	 */
	public generateScoringTable(dimensions: EvaluationDimension[]): string {
		const dimensionCount = dimensions.length;
		let table = `# 评分标准表 (总计10分，${dimensionCount}个维度均分)\n\n`;
		
		dimensions.forEach((dimension, dimIndex) => {
			table += `## ${dimIndex + 1}. ${dimension.name} (0-10分)\n`;
			table += `**描述**: ${dimension.description}\n`;
			table += `**评分指导**:\n`;
			dimension.criteria.forEach((criterion: string) => {
				table += `- ${criterion}\n`;
			});
			table += `**得分**: __/10分 (可以是任意数字，如7.5分)\n\n`;
		});

		table += `## 总分计算\n`;
		table += `| 维度 | 得分 | 说明 |\n`;
		table += `|------|------|------|\n`;
		dimensions.forEach((dimension, index) => {
			table += `| ${dimension.name} | __/10分 | 可以是任意数字 |\n`;
		});
		table += `| **平均分** | **__/10分** | **所有维度均分** |\n`;

		return table;
	}
}