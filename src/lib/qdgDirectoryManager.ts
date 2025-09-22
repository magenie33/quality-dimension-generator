import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * QDG (Quality Dimension Generator) Directory Manager
 * Creates and manages .qdg folder structure in current project directory only
 * 
 * Directory structure:
 * .qdg/
 * ├── config/          - Configuration files
 * └── tasks/           - Task records (flat files with semantic naming)
 *     ├── TaskId_TaskName.md  - Individual task files
 *     └── TaskId2_AnotherTask.md
 */
export class QdgDirectoryManager {
	private readonly QDG_DIR_NAME = '.qdg';
	
	/**
	 * Get .qdg directory path in current project directory
	 */
	getQdgDirectory(projectPath: string): string {
		// Simplified: only use the passed projectPath, no complex path resolution
		return join(projectPath, this.QDG_DIR_NAME);
	}
	
	/**
	 * Get paths for subdirectories
	 */
	getSubDirectories(projectPath: string) {
		const qdgDir = this.getQdgDirectory(projectPath);
		return {
			qdgDir,
			tasks: join(qdgDir, 'tasks'),
			config: join(qdgDir, 'config')
		};
	}
	
	/**
	 * Initialize .qdg directory structure
	 * Create necessary subdirectories and configuration files
	 */
	async initializeQdgDirectory(projectPath: string): Promise<{
		qdgDir: string;
		created: string[];
		existed: string[];
	}> {
		const dirs = this.getSubDirectories(projectPath);
		const created: string[] = [];
		const existed: string[] = [];
		
		// Create all necessary directories
		for (const [name, dirPath] of Object.entries(dirs)) {
			try {
				await fs.mkdir(dirPath, { recursive: true });
				
				// Check if directory is newly created
				try {
					const stats = await fs.stat(dirPath);
					if (stats.isDirectory()) {
						// Check if directory is empty to determine if newly created
						const files = await fs.readdir(dirPath);
						if (files.length === 0 && name !== 'qetDir') {
							created.push(name);
						} else if (name !== 'qetDir') {
							existed.push(name);
						}
					}
				} catch {
					created.push(name);
				}
			} catch (error) {
				console.warn(`Failed to create directory ${name}:`, error);
			}
		}
		
		// Create configuration files
		await this.createConfigFiles(dirs);
		
		return {
			qdgDir: dirs.qdgDir,
			created,
			existed
		};
	}
	
	/**
	 * Create default configuration files
	 */
	private async createConfigFiles(dirs: ReturnType<typeof this.getSubDirectories>): Promise<void> {
		// Create main configuration file
		const mainConfigPath = join(dirs.config, 'qdg.config.json');
		try {
			await fs.access(mainConfigPath);
			// File already exists, do not overwrite
		} catch {
			// File does not exist, create default configuration (settings only)
			const defaultConfig = {
				settings: {
					dimensionCount: 5,    // Default 5 dimensions
					expectedScore: 8      // Default expected score 8
				}
			};
			
			await fs.writeFile(mainConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
		}
	}
	
	/**
	 * Sanitize task name for safe file naming
	 */
	private sanitizeTaskName(taskName: string): string {
		return taskName
			.replace(/[<>:"/\\|?*]/g, '') // Remove illegal file characters
			.replace(/\s+/g, '_') // Replace spaces with underscores
			.replace(/[^\w\u4e00-\u9fa5_-]/g, '') // Keep only word characters, Chinese characters, underscores, and hyphens
			.substring(0, 50); // Limit length to 50 characters
	}

	/**
	 * Get task file path (flat structure)
	 */
	getTaskFilePath(projectPath: string, taskId: string, taskName: string): string {
		const dirs = this.getSubDirectories(projectPath);
		const sanitizedTaskName = this.sanitizeTaskName(taskName);
		return join(dirs.tasks, `${taskId}_${sanitizedTaskName}.md`);
	}

	/**
	 * Check if QDG directory is initialized
	 */
	async isQdgDirectoryInitialized(projectPath: string): Promise<boolean> {
		try {
			const qdgDir = this.getQdgDirectory(projectPath);
			const stats = await fs.stat(qdgDir);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	/**
	 * Get QDG configuration
	 */
	async getQdgConfig(projectPath: string): Promise<any> {
		const dirs = this.getSubDirectories(projectPath);
		const configPath = join(dirs.config, 'qdg.config.json');
		
		try {
			const content = await fs.readFile(configPath, 'utf-8');
			return JSON.parse(content);
		} catch {
			// Return default configuration (settings only)
			return {
				settings: {
					dimensionCount: 5,    // Default 5 dimensions
					expectedScore: 8      // Default expected score 8
				}
			};
		}
	}

	/**
	 * Save final evaluation dimension standards (flat file structure with LLM-generated task name)
	 * This is the main method used by the 3-tool workflow
	 */
	async saveFinalDimensionStandardsFlat(
		projectPath: string, 
		taskId: string, 
		taskName: string,
		task: any, 
		refinedTaskDescription: string, 
		dimensionsContent: string
	): Promise<string> {
		try {
			const dirs = this.getSubDirectories(projectPath);
			const taskFilePath = this.getTaskFilePath(projectPath, taskId, taskName);
			
			// Ensure tasks directory exists
			await fs.mkdir(dirs.tasks, { recursive: true });
			
			// Verify directory creation succeeded
			const dirStats = await fs.stat(dirs.tasks);
			if (!dirStats.isDirectory()) {
				throw new Error(`Tasks directory creation failed: ${dirs.tasks}`);
			}
			
			// Generate task objectives section
			const objectivesSection = task.objectives 
				? task.objectives.map((obj: any) => `- ${obj}`).join('\n') 
				: 'None';
			
			// Generate key elements section
			const keyElementsSection = task.keyElements 
				? task.keyElements.map((elem: any) => `- ${elem}`).join('\n') 
				: 'None';
			
			// Generate final evaluation standards document (containing two LLM outputs)
			const finalContent = `# Quality Evaluation Standards

## 📋 Task Information
- **Task ID**: ${taskId}
- **Task Name**: ${taskName}
- **Creation Time**: ${new Date().toLocaleString('en-US')}
- **Core Task**: ${task.coreTask || 'Not specified'}
- **Task Type**: ${task.taskType || 'Not specified'}
- **Complexity**: ${task.complexity || 'N/A'}/5
- **Domain**: ${task.domain || 'Not specified'}

## 🎯 Task Objectives
${objectivesSection}

## 🔑 Key Elements
${keyElementsSection}

---

## 📋 Task Refinement (First Stage Output)

${refinedTaskDescription}

---

## ⭐ Evaluation Dimension System (Second Stage Output)

${dimensionsContent}

---

## 📖 Usage Instructions

**Scoring Method**: Each dimension can be scored 0-10 with any number (including decimals)  
**Reference Standards**: 6 points passing, 8 points excellent, 10 points outstanding  
**Final Score**: Average of all dimension scores

**Status**: ✅ Task refinement and evaluation standards completed, ready to start task execution

---

*Quality Dimension Generator - Complete Two-Stage Output*
*Generated at: ${new Date().toISOString()}*
`;
			
			// Write final file
			await fs.writeFile(taskFilePath, finalContent, { encoding: 'utf-8' });
			
			// Verify file write succeeded and read confirmation
			const fileStats = await fs.stat(taskFilePath);
			
			if (fileStats.size === 0) {
				throw new Error('File write failed: file size is 0');
			}
			
			console.log(`✅ Final evaluation standards saved: ${taskFilePath} (${fileStats.size} bytes)`);
			return taskFilePath;
			
		} catch (error) {
			console.error('Failed to save final evaluation standards:', error);
			throw new Error(`Failed to save final evaluation standards: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}