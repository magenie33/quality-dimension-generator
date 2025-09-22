import { TaskAnalysis, ConversationInput } from './types.js';

/**
 * Task Extractor Class - Pure prompt approach
 * Only generates prompts for LLM to analyze tasks, makes no subjective judgments
 */
export class TaskExtractor {
	
	/**
	 * Generate task analysis prompt
	 * Let LLM analyze tasks and output structured results
	 */
	public generateTaskAnalysisPrompt(input: ConversationInput): string {
		const { userMessage, conversationHistory = [] } = input;
		
		const context = this.buildAnalysisContext(userMessage, conversationHistory);
		
		return `Please analyze the user's core task based on the following conversation content:

Conversation Content:
${context.rawText}

Please analyze according to the following dimensions and output the result in JSON format:

\`\`\`json
{
  "coreTask": "Description of the user's core task",
  "taskName": "Concise task name (suitable for file naming, can be in any language)",
  "taskType": "Task type (e.g., development, design, analysis, learning, management, consulting, etc.)",
  "complexity": Complexity level (1-5),
  "domain": "Task domain (e.g., technical development, business management, education and training, etc.)",
  "keyElements": ["Key element 1", "Key element 2", "Key element 3"],
  "objectives": ["Main objective 1", "Main objective 2", "Main objective 3"]
}
\`\`\`

Analysis Requirements:
1. Core Task: Extract the user's main needs and expected goals
2. Task Name: Generate a concise name of 3-15 characters, suitable for file naming, avoid special symbols
3. Task Type: Classify according to the nature of the task
3. Complexity: 1=Simple 2=Fairly Simple 3=Medium 4=Fairly Complex 5=Complex
4. Domain: Identify the professional domain to which the task belongs
5. Key Elements: Identify important constraints, technical requirements, standard requirements, etc.
6. Objectives: Break down into specific, measurable goals

Please ensure the analysis is accurate, specific, and practical.`;
	}

	/**
	 * Parse LLM-returned task analysis result
	 */
	public parseTaskAnalysisResult(llmResponse: string): TaskAnalysis {
		// Extract JSON part
		const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
		if (!jsonMatch) {
			throw new Error('JSON format analysis result not found');
		}

		const result = JSON.parse(jsonMatch[1]);
		
		// Validate required fields
		if (!result.coreTask || !result.taskType || !result.domain || !result.taskName) {
			throw new Error('Analysis result missing required fields');
		}

		return {
			coreTask: result.coreTask,
			taskName: result.taskName,
			taskType: result.taskType,
			complexity: result.complexity || 3,
			domain: result.domain,
			keyElements: Array.isArray(result.keyElements) ? result.keyElements : [],
			objectives: Array.isArray(result.objectives) ? result.objectives : []
		};
	}

	/**
	 * Build analysis context
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