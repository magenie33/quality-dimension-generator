/**
 * Quality Evaluation Dimension (matches the JSON output format from LLM)
 */
export interface QualityDimension {
	/** Dimension name (3-15 characters, specific and clear) */
	name: string;
	/** One sentence description of what this dimension evaluates */
	description: string;
	/** One sentence explaining why this dimension is critical for the task */
	importance: string;
	/** Scoring criteria for different performance levels */
	scoring: {
		/** Criteria for excellent performance (measurable and actionable) */
		"10": string;
		/** Criteria for good performance (measurable and actionable) */
		"8": string;
		/** Criteria for acceptable performance (measurable and actionable) */
		"6": string;
	};
}

/**
 * Quality Dimensions Response (complete LLM output format)
 */
export interface QualityDimensionsResponse {
	/** Array of quality evaluation dimensions */
	dimensions: QualityDimension[];
}

/**
 * Validation result
 */
export interface ValidationResult {
	/** Whether validation passed */
	isValid: boolean;
	/** Error messages if validation failed */
	errors: string[];
	/** Parsed data if validation passed */
	data?: any;
}

/**
 * Validate TaskAnalysis JSON format
 */
export function validateTaskAnalysis(jsonString: string): ValidationResult {
	try {
		const data = JSON.parse(jsonString);
		const errors: string[] = [];

		// Check required fields
		if (!data.coreTask || typeof data.coreTask !== 'string') {
			errors.push('Missing or invalid coreTask field');
		}
		if (!data.taskName || typeof data.taskName !== 'string') {
			errors.push('Missing or invalid taskName field');
		}
		if (!data.taskType || typeof data.taskType !== 'string') {
			errors.push('Missing or invalid taskType field');
		}
		if (!data.domain || typeof data.domain !== 'string') {
			errors.push('Missing or invalid domain field');
		}
		if (typeof data.complexity !== 'number' || data.complexity < 1 || data.complexity > 5) {
			errors.push('complexity must be a number between 1-5');
		}
		if (!Array.isArray(data.keyElements)) {
			errors.push('keyElements must be an array');
		}
		if (!Array.isArray(data.objectives)) {
			errors.push('objectives must be an array');
		}

		// Check taskName length (for file naming)
		if (data.taskName && (data.taskName.length < 3 || data.taskName.length > 15)) {
			errors.push('taskName should be 3-15 characters for file naming');
		}

		return {
			isValid: errors.length === 0,
			errors,
			data: errors.length === 0 ? data : undefined
		};
	} catch (error) {
		return {
			isValid: false,
			errors: [`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`]
		};
	}
}

/**
 * Validate QualityDimensions JSON format
 */
export function validateQualityDimensions(jsonString: string, expectedCount: number): ValidationResult {
	try {
		const data = JSON.parse(jsonString);
		const errors: string[] = [];

		// Check dimensions array
		if (!data.dimensions || !Array.isArray(data.dimensions)) {
			errors.push('Missing or invalid dimensions array');
			return { isValid: false, errors };
		}

		// Check dimension count
		if (data.dimensions.length !== expectedCount) {
			errors.push(`Expected ${expectedCount} dimensions, got ${data.dimensions.length}`);
		}

		// Validate each dimension
		data.dimensions.forEach((dim: any, index: number) => {
			const prefix = `Dimension ${index + 1}:`;
			
			// Check required fields
			if (!dim.name || typeof dim.name !== 'string') {
				errors.push(`${prefix} Missing or invalid name field`);
			} else if (dim.name.length < 3 || dim.name.length > 15) {
				errors.push(`${prefix} name should be 3-15 characters, got ${dim.name.length}`);
			}

			if (!dim.description || typeof dim.description !== 'string') {
				errors.push(`${prefix} Missing or invalid description field`);
			}

			if (!dim.importance || typeof dim.importance !== 'string') {
				errors.push(`${prefix} Missing or invalid importance field`);
			}

			// Check scoring object
			if (!dim.scoring || typeof dim.scoring !== 'object') {
				errors.push(`${prefix} Missing or invalid scoring object`);
			} else {
				const requiredScores = ['6', '8', '10'];
				requiredScores.forEach(score => {
					if (!dim.scoring[score] || typeof dim.scoring[score] !== 'string') {
						errors.push(`${prefix} Missing or invalid scoring["${score}"] field`);
					}
				});

				// Check for extra scoring levels
				const actualScores = Object.keys(dim.scoring);
				const extraScores = actualScores.filter(score => !requiredScores.includes(score));
				if (extraScores.length > 0) {
					errors.push(`${prefix} Unexpected scoring levels: ${extraScores.join(', ')}`);
				}
			}
		});

		return {
			isValid: errors.length === 0,
			errors,
			data: errors.length === 0 ? data : undefined
		};
	} catch (error) {
		return {
			isValid: false,
			errors: [`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`]
		};
	}
}

/**
 * Task Analysis Result
 */
export interface TaskAnalysis {
	/** Extracted core task */
	coreTask: string;
	/** Task name for file naming (generated by LLM) */
	taskName: string;
	/** Task type */
	taskType: string;
	/** Task complexity (1-5) */
	complexity: number;
	/** Task domain */
	domain: string;
	/** Key elements */
	keyElements: string[];
	/** Task objectives */
	objectives: string[];
}

/**
 * Time Context Information
 */
export interface TimeContext {
	/** Current timestamp */
	timestamp: number;
	/** Formatted time string */
	formattedTime: string;
	/** Timezone information */
	timezone: string;
	/** Year */
	year: number;
	/** Month */
	month: number;
	/** Day */
	day: number;
	/** Day of week */
	weekday: string;
}

/**
 * Conversation Analysis Input
 */
export interface ConversationInput {
	/** User message */
	userMessage: string;
	/** Conversation history (optional) */
	conversationHistory?: Array<{
		role: 'user' | 'assistant';
		content: string;
		timestamp?: number;
	}>;
	/** Context information (optional) */
	context?: Record<string, unknown>;
}