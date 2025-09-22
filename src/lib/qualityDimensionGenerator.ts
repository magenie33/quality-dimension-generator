import { TaskAnalysis, TimeContext, QualityDimensionsResponse, QualityDimension, validateQualityDimensions } from './types.js';

/**
 * Quality Evaluation Dimension Generator
 * Supports configurable dimension count and expected score
 */
export class QualityDimensionGenerator {
	private dimensionCount: number;
	private expectedScore: number;
	
	constructor(config: { dimensionCount: number; expectedScore: number } = { dimensionCount: 5, expectedScore: 8 }) {
		this.dimensionCount = config.dimensionCount;
		this.expectedScore = config.expectedScore;
	}
	
	/**
	 * Generate dimension scoring prompt using configured dimension count and expected score
	 */
	public async generateDimensionsPrompt(
		task: TaskAnalysis,
		timeContext: TimeContext
	): Promise<string> {
		// Use instance configuration
		const dimensionCount = this.dimensionCount;
		const expectedScore = this.expectedScore;

		return `Please analyze the following task and generate ${dimensionCount} evaluation dimensions in JSON format:

## 📋 Task Information
- **Core Task**: ${task.coreTask}
- **Task Type**: ${task.taskType}
- **Complexity**: ${task.complexity}/5
- **Domain**: ${task.domain}
- **Key Elements**: ${task.keyElements.join(', ')}
- **Objectives**: ${task.objectives.join(', ')}

## ⏰ Time Context
- **Current Time**: ${timeContext.formattedTime}
- **Year**: ${timeContext.year}, Month: ${timeContext.month}

## 🎯 Quality Target
- **Expected Score**: ${expectedScore}/10 points
- **Total Score Calculation**: Average of all ${dimensionCount} dimension scores

Please analyze according to the following requirements and output the result in JSON format:

\`\`\`json
{
  "dimensions": [
    {
      "name": "Dimension name (3-15 characters, specific and clear)",
      "description": "One sentence description of what this dimension evaluates",
      "importance": "One sentence explaining why this dimension is critical for the task",
      "scoring": {
        "10": "Specific criteria for excellent performance (measurable and actionable)",
        "8": "Specific criteria for good performance (measurable and actionable)", 
        "6": "Specific criteria for acceptable performance (measurable and actionable)"
      }
    },
    {
      "name": "Second dimension name",
      "description": "Description of second dimension",
      "importance": "Why this dimension matters",
      "scoring": {
        "10": "Excellent criteria for dimension 2",
        "8": "Good criteria for dimension 2",
        "6": "Acceptable criteria for dimension 2"
      }
    }
    // ... continue for all ${dimensionCount} dimensions
  ]
}
\`\`\`

## ✅ Analysis Requirements
1. **Dimension Count**: Generate exactly ${dimensionCount} dimensions that comprehensively cover the task
2. **Dimension Names**: Use concise, professional names (3-15 characters) that clearly indicate what is being evaluated
3. **Descriptions**: One clear sentence explaining the scope of each dimension's evaluation
4. **Importance**: Explain why each dimension is essential for achieving task success
5. **Scoring Criteria**: Each score level (6, 8, 10) must have specific, measurable, actionable criteria
6. **Quality Standards**: Design criteria so that achieving an average of ${expectedScore}/10 across all dimensions represents realistic excellence for this task
7. **Domain Relevance**: All dimensions must be appropriate for the "${task.domain}" domain
8. **Comprehensive Coverage**: The ${dimensionCount} dimensions together should evaluate all critical aspects of the task

## ⚠️ JSON Format Requirements
- Ensure valid JSON syntax with proper quotes and commas
- Each dimension object must include all 4 fields: name, description, importance, scoring
- Scoring object must have exactly 3 levels: "6", "8", "10"
- All text should be professional and specific to the task domain
- Generate complete and valid JSON that can be directly parsed

## 🎯 Final Reminder
Generate exactly ${dimensionCount} complete dimensions that together provide a comprehensive evaluation framework for: "${task.coreTask}"

**Important**: Each dimension must include all 4 required fields (name, description, importance, scoring with 6/8/10 levels).

Please ensure the JSON is complete, valid, and directly usable for evaluation purposes.`;
	}
	
	/**
	 * Parse and validate LLM-returned quality dimensions result
	 */
	public parseQualityDimensionsResult(llmResponse: string): QualityDimensionsResponse {
		// Extract JSON part
		const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
		if (!jsonMatch) {
			throw new Error('JSON format quality dimensions result not found');
		}

		// Validate JSON format and structure
		const validation = validateQualityDimensions(jsonMatch[1], this.dimensionCount);
		if (!validation.isValid) {
			throw new Error(`Quality dimensions validation failed:\n${validation.errors.join('\n')}`);
		}

		return validation.data as QualityDimensionsResponse;
	}

	/**
	 * Parse and validate LLM-returned quality dimensions result
	 */
	public parseDimensionsResult(llmResponse: string): QualityDimensionsResponse {
		// Extract JSON part
		const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
		if (!jsonMatch) {
			throw new Error('JSON format dimensions result not found');
		}

		const result = JSON.parse(jsonMatch[1]);
		
		// Validate root structure
		if (!result.dimensions || !Array.isArray(result.dimensions)) {
			throw new Error('Invalid structure: missing or invalid dimensions array');
		}

		// Validate dimension count
		if (result.dimensions.length !== this.dimensionCount) {
			throw new Error(`Expected ${this.dimensionCount} dimensions, got ${result.dimensions.length}`);
		}

		// Validate each dimension
		result.dimensions.forEach((dimension: any, index: number) => {
			this.validateDimension(dimension, index);
		});

		return {
			dimensions: result.dimensions as QualityDimension[]
		};
	}

	/**
	 * Validate a single dimension object
	 */
	private validateDimension(dimension: any, index: number): void {
		const requiredFields = ['name', 'description', 'importance', 'scoring'];
		
		// Check required fields
		for (const field of requiredFields) {
			if (!dimension[field]) {
				throw new Error(`Dimension ${index + 1}: missing required field '${field}'`);
			}
		}

		// Validate name length
		if (dimension.name.length < 3 || dimension.name.length > 15) {
			throw new Error(`Dimension ${index + 1}: name should be 3-15 characters, got ${dimension.name.length}`);
		}

		// Validate scoring structure
		if (!dimension.scoring || typeof dimension.scoring !== 'object') {
			throw new Error(`Dimension ${index + 1}: invalid scoring object`);
		}

		const requiredScores = ['6', '8', '10'];
		for (const score of requiredScores) {
			if (!dimension.scoring[score] || typeof dimension.scoring[score] !== 'string') {
				throw new Error(`Dimension ${index + 1}: missing or invalid scoring criteria for level ${score}`);
			}
		}

		// Check for extra scoring levels
		const actualScores = Object.keys(dimension.scoring);
		const extraScores = actualScores.filter(score => !requiredScores.includes(score));
		if (extraScores.length > 0) {
			throw new Error(`Dimension ${index + 1}: unexpected scoring levels: ${extraScores.join(', ')}`);
		}
	}
}