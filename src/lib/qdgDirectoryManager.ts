import { promises as fs } from 'fs';
import { join, resolve } from 'path';

/**
 * QDG (Quality Dimension Generator) Directory Manager
 * Responsible for creating and managing .qdg folder structure in project root
 * 
 * New directory structure (focused on dimension generation):
 * .qdg/
 * ├── config/          - Global configuration files
 * └── tasks/           - Task records (sorted by timestamp)
 *     └── task_xxx/    - Individual task folder
 *         └── task_xxx_dimension.md  - Quality dimensions (readable format)
 */
export class QdgDirectoryManager {
	private readonly QDG_DIR_NAME = '.qdg';
	
	/**
	 * Get .qdg directory path in project root
	 */
	getQdgDirectory(projectPath: string): string {
		return join(resolve(projectPath), this.QDG_DIR_NAME);
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
	 * Get task folder path
	 */
	getTaskDirectory(projectPath: string, taskId: string): string {
		const dirs = this.getSubDirectories(projectPath);
		return join(dirs.tasks, taskId);
	}
	
	/**
	 * Get snapshot storage path
	 */
	getSnapshotPath(projectPath: string, taskId: string): string {
		return join(this.getTaskDirectory(projectPath, taskId), `${taskId}_snapshot.json`);
	}
	
	/**
	 * Get evaluation result storage path
	 */
	getEvaluationPath(projectPath: string, taskId: string): string {
		return join(this.getTaskDirectory(projectPath, taskId), `${taskId}_evaluation.json`);
	}
	
	/**
	 * Get dimension definition storage path
	 */
	getDimensionPath(projectPath: string, taskId: string): string {
		return join(this.getTaskDirectory(projectPath, taskId), `${taskId}_dimension.md`);
	}
	/**
	 * Save LLM-generated evaluation dimension standards (enhanced version)
	 */
	async saveDimensionStandards(projectPath: string, taskId: string, task: any, generatedDimensions: string): Promise<string> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			const dimensionPath = this.getDimensionPath(projectPath, taskId);
			
			// Ensure task directory exists with multiple checks
			await fs.mkdir(taskDir, { recursive: true });
			
			// Verify directory creation succeeded
			const dirStats = await fs.stat(taskDir);
			if (!dirStats.isDirectory()) {
				throw new Error(`Task directory creation failed: ${taskDir}`);
			}
			
			// Generate complete evaluation standards document
			const standardsContent = `# Quality Evaluation Standards

## 📋 Task Information
- **Task ID**: ${taskId}
- **Creation Time**: ${new Date().toLocaleString('en-US')}
- **Core Task**: ${task.coreTask || 'Not specified'}
- **Task Type**: ${task.taskType || 'Not specified'}
- **Complexity**: ${task.complexity || 'N/A'}/5
- **Domain**: ${task.domain || 'Not specified'}

## 🎯 Task Objectives
${task.objectives ? task.objectives.map((obj: any) => `- ${obj}`).join('\n') : 'None'}

## 🔑 Key Elements
${task.keyElements ? task.keyElements.map((elem: any) => `- ${elem}`).join('\n') : 'None'}

---

## ⭐ Evaluation Dimension Standards

${generatedDimensions}

---

## 📊 Usage Instructions

### Scoring Method
- **Score Range**: Each dimension can be scored 0-10 with any number (including decimals)
- **Reference Standards**: 6 points passing, 8 points excellent, 10 points outstanding
- **Final Score**: Average of all dimension scores
- **Scoring Requirements**: Please score strictly according to the above standards based on actual completion

### Document Information
- **Generation Time**: ${new Date().toISOString()}
- **Document Type**: QDG Quality Evaluation Standards (Complete Version)
- **Task ID**: ${taskId}
- **Status**: ✅ Standards completed, ready to start task execution

---

*This document is automatically generated and saved by Quality Dimension Generator*
`;
			
			// Write file with correct encoding
			await fs.writeFile(dimensionPath, standardsContent, { encoding: 'utf-8' });
			
			// Verify file write succeeded
			const fileStats = await fs.stat(dimensionPath);
			if (fileStats.size === 0) {
				throw new Error('File write failed: file size is 0');
			}
			
			// Verify file content
			const savedContent = await fs.readFile(dimensionPath, 'utf-8');
			if (!savedContent.includes(taskId) || !savedContent.includes(generatedDimensions)) {
				throw new Error('File content verification failed: saved content incomplete');
			}
			
			console.log(`✅ Evaluation standards successfully saved: ${dimensionPath} (${fileStats.size} bytes)`);
			return dimensionPath;
			
		} catch (error) {
			console.error('❌ Failed to save evaluation standards:', error);
			throw new Error(`Failed to save evaluation standards: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Read saved evaluation standards
	 */
	async readDimensionStandards(projectPath: string, taskId: string): Promise<string | null> {
		try {
			const dimensionPath = this.getDimensionPath(projectPath, taskId);
			const content = await fs.readFile(dimensionPath, 'utf-8');
			return content;
		} catch {
			return null;
		}
	}

	
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
	 * Save clean single-file output: pure task description and evaluation dimensions
	 */
	async saveCleanOutput(
		projectPath: string, 
		taskId: string, 
		refinedTaskDescription: string, 
		dimensionsContent: string
	): Promise<string> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			
			// Ensure task directory exists
			await fs.mkdir(taskDir, { recursive: true });
			
			// Define output file path
			const outputFilePath = join(taskDir, `${taskId}_output.md`);
			
			// Create clean file content: containing only pure two outputs
			const cleanContent = `# Task Description

${refinedTaskDescription}

---

# Evaluation Dimensions

${dimensionsContent}`;
			
			// Write file
			await fs.writeFile(outputFilePath, cleanContent, { encoding: 'utf-8' });
			
			// Verify file creation succeeded
			const fileStats = await fs.stat(outputFilePath);
			
			if (fileStats.size === 0) {
				throw new Error('File write failed: file size is 0');
			}
			
			console.log(`✅ Clean output saved: ${outputFilePath} (${fileStats.size} bytes)`);
			
			return outputFilePath;
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error('❌ Failed to save clean output:', errorMessage);
			throw new Error(`Failed to save clean output: ${errorMessage}`);
		}
	}

	/**
	 * Save dual-file output: pure versions of task description and evaluation dimensions
	 * Returns two independent md file paths
	 */
	async saveDualOutputFiles(
		projectPath: string, 
		taskId: string, 
		refinedTaskDescription: string, 
		dimensionsContent: string
	): Promise<{ taskFilePath: string; dimensionsFilePath: string }> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			
			// Ensure task directory exists
			await fs.mkdir(taskDir, { recursive: true });
			
			// Define two file paths
			const taskFilePath = join(taskDir, `${taskId}_task.md`);
			const dimensionsFilePath = join(taskDir, `${taskId}_dimensions.md`);
			
			// Create pure task description file
			const taskContent = refinedTaskDescription;
			
			// Create pure evaluation dimensions file
			const dimensionsFileContent = dimensionsContent;
			
			// Write two files in parallel
			await Promise.all([
				fs.writeFile(taskFilePath, taskContent, { encoding: 'utf-8' }),
				fs.writeFile(dimensionsFilePath, dimensionsFileContent, { encoding: 'utf-8' })
			]);
			
			// Verify file creation succeeded
			const [taskStats, dimensionsStats] = await Promise.all([
				fs.stat(taskFilePath),
				fs.stat(dimensionsFilePath)
			]);
			
			if (taskStats.size === 0 || dimensionsStats.size === 0) {
				throw new Error('File write failed: file size is 0');
			}
			
			console.log(`✅ Dual-file output saved:`);
			console.log(`📄 Task file: ${taskFilePath} (${taskStats.size} bytes)`);
			console.log(`⭐ Dimensions file: ${dimensionsFilePath} (${dimensionsStats.size} bytes)`);
			
			return { taskFilePath, dimensionsFilePath };
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error('❌ Failed to save dual-file output:', errorMessage);
			throw new Error(`Failed to save dual-file output: ${errorMessage}`);
		}
	}

	/**
	 * Save final evaluation dimension standards (dedicated for save_quality_dimensions tool)
	 */
	async saveFinalDimensionStandards(projectPath: string, taskId: string, task: any, refinedTaskDescription: string, dimensionsContent: string): Promise<string> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			const dimensionPath = this.getDimensionPath(projectPath, taskId);
			
			// Ensure task directory exists
			await fs.mkdir(taskDir, { recursive: true });
			
			// Verify directory creation succeeded
			const dirStats = await fs.stat(taskDir);
			if (!dirStats.isDirectory()) {
				throw new Error(`Task directory creation failed: ${taskDir}`);
			}
			
			// Generate final evaluation standards document (containing two LLM outputs)
			const finalContent = `# Quality Evaluation Standards

## 📋 Task Refinement (First Stage Output)

${refinedTaskDescription}

---

## ⭐ Evaluation Dimension System (Second Stage Output)

${dimensionsContent}

---

## 📖 Usage Instructions

**Task ID**: ${taskId}  
**Generation Time**: ${new Date().toLocaleString('en-US')}

**Scoring Method**: Each dimension can be scored 0-10 with any number (including decimals)  
**Reference Standards**: 6 points passing, 8 points excellent, 10 points outstanding  
**Final Score**: Average of all dimension scores

**Status**: ✅ Task refinement and evaluation standards completed, ready to start task execution

---

*Quality Dimension Generator - Complete Two-Stage Output*
`;
			
			// Write final file
			await fs.writeFile(dimensionPath, finalContent, { encoding: 'utf-8' });
			
			// Verify file write succeeded and read confirmation
			const fileStats = await fs.stat(dimensionPath);
			
			if (fileStats.size === 0) {
				throw new Error('File write failed: file size is 0');
			}
			
			console.log(`✅ Final evaluation standards saved: ${dimensionPath} (${fileStats.size} bytes)`);
			return dimensionPath;
			
		} catch (error) {
			console.error('Failed to save final evaluation standards:', error);
			throw new Error(`Failed to save final evaluation standards: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}