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

		return `🎯 **重要说明：请严格按照格式生成，确保后续程序能正确解析和保存！**

根据以下任务信息，生成${dimensionCount}个评价维度的完整评分标准：

## 📋 任务信息
- **核心任务**：${task.coreTask}
- **任务类型**：${task.taskType}
- **复杂度**：${task.complexity}/5
- **领域**：${task.domain}
- **关键要素**：${task.keyElements.join(', ')}
- **目标**：${task.objectives.join(', ')}

## ⏰ 时间背景
- **当前时间**：${timeContext.formattedTime}
- **年份**：${timeContext.year}年${timeContext.month}月

## 🎯 质量目标
- **期望分数**：${expectedScore}/10分
- **评分严格程度**：${expectedScore >= 8 ? '高标准（严格评价）' : expectedScore >= 6 ? '中等标准（适中评价）' : '基础标准（宽松评价）'}
- **质量要求**：${expectedScore >= 8 ? '追求卓越，细节完美' : expectedScore >= 6 ? '良好质量，主要功能完备' : '基本可用，满足基础需求'}

---

## ⚡ **格式要求（请严格遵守）**

**必须按照以下精确格式输出，每个维度包含标题、描述、重要性、评分指导四个部分：**

### 维度1：[具体维度名称] (0-10分)
**描述**：[简洁明确的维度说明，一句话概括评价范围]
**重要性**：[一句话说明为什么这个维度重要]
**评分指导**：
- **10分**：[具体明确的卓越标准，可操作可测量]
- **8分**：[具体明确的优秀标准，可操作可测量]
- **6分**：[具体明确的及格标准，可操作可测量]

### 维度2：[具体维度名称] (0-10分)
**描述**：[简洁明确的维度说明，一句话概括评价范围]
**重要性**：[一句话说明为什么这个维度重要]
**评分指导**：
- **10分**：[具体明确的卓越标准，可操作可测量]
- **8分**：[具体明确的优秀标准，可操作可测量]
- **6分**：[具体明确的及格标准，可操作可测量]

**[继续生成${dimensionCount}个维度，严格按照上述格式]**

---

## ✅ **质量要求**
1. **格式完全一致**：每个维度必须包含标题、描述、重要性、评分指导
2. **标准具体明确**：每个评分指导都要具体可操作，避免模糊表述
3. **覆盖全面**：${dimensionCount}个维度应覆盖任务的所有关键方面
4. **专业性强**：符合${task.domain}领域的专业标准
5. **目标匹配**：评分标准的严格程度与期望分数${expectedScore}/10分相符

## ⚠️ **关键注意事项**
- **严格格式**：必须使用"### 维度X："开头，"**描述**："、"**重要性**："、"**评分指导**："标签
- **完整输出**：必须生成完整的${dimensionCount}个维度，不能省略
- **标准明确**：10分、8分、6分的标准要有明显区别，便于评分
- **实用性强**：生成的标准要便于实际使用和评分

🚀 **请现在开始生成${dimensionCount}个评价维度！**`;
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