import { promises as fs } from 'fs';
import { join, resolve } from 'path';

/**
 * QDG (Quality Dimension Generator) 目录管理器
 * 负责在项目根		// 创建README.md
		const readmePath = join(dirs.qdgDir, 'README.md');创建和管理 .qdg 文件夹结构
 * 
 * 新的目录结构（专注于维度生成）：
 * .qdg/
 * ├── config/          - 全局配置文件
 * └── tasks/           - 任务记录（按时间戳排序）
 *     └── task_xxx/    - 单个任务文件夹
 *         └── task_xxx_dimension.md  - 质量维度（易读格式）
 */
export class QdgDirectoryManager {
	private readonly QDG_DIR_NAME = '.qdg';
	
	/**
	 * 获取项目根目录中的 .qdg 目录路径
	 */
	getQdgDirectory(projectPath: string): string {
		return join(resolve(projectPath), this.QDG_DIR_NAME);
	}
	
	/**
	 * 获取各个子目录的路径
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
	 * 初始化 .qdg 目录结构
	 * 创建必要的子目录和配置文件
	 */
	async initializeQdgDirectory(projectPath: string): Promise<{
		qdgDir: string;
		created: string[];
		existed: string[];
	}> {
		const dirs = this.getSubDirectories(projectPath);
		const created: string[] = [];
		const existed: string[] = [];
		
		// 创建所有必要的目录
		for (const [name, dirPath] of Object.entries(dirs)) {
			try {
				await fs.mkdir(dirPath, { recursive: true });
				
				// 检查目录是否是新创建的
				try {
					const stats = await fs.stat(dirPath);
					if (stats.isDirectory()) {
						// 检查目录是否为空来判断是否是新创建的
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
				console.warn(`创建目录 ${name} 失败:`, error);
			}
		}
		
		// 创建配置文件
		await this.createConfigFiles(dirs);
		
		return {
			qdgDir: dirs.qdgDir,
			created,
			existed
		};
	}
	
	/**
	 * 创建默认配置文件
	 */
	private async createConfigFiles(dirs: ReturnType<typeof this.getSubDirectories>): Promise<void> {
		// 创建主配置文件
		const mainConfigPath = join(dirs.config, 'qdg.config.json');
		try {
			await fs.access(mainConfigPath);
			// 文件已存在，不覆盖
		} catch {
			// 文件不存在，创建默认配置（只包含设置项）
			const defaultConfig = {
				settings: {
					dimensionCount: 5,    // 默认5个维度
					expectedScore: 8      // 默认期望8分
				}
			};
			
			await fs.writeFile(mainConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
		}
	}
	
	/**
	 * 获取任务文件夹路径
	 */
	getTaskDirectory(projectPath: string, taskId: string): string {
		const dirs = this.getSubDirectories(projectPath);
		return join(dirs.tasks, taskId);
	}
	
	/**
	 * 获取快照存储路径
	 */
	getSnapshotPath(projectPath: string, taskId: string): string {
		return join(this.getTaskDirectory(projectPath, taskId), `${taskId}_snapshot.json`);
	}
	
	/**
	 * 获取评价结果存储路径
	 */
	getEvaluationPath(projectPath: string, taskId: string): string {
		return join(this.getTaskDirectory(projectPath, taskId), `${taskId}_evaluation.json`);
	}
	
	/**
	 * 获取维度定义存储路径
	 */
	getDimensionPath(projectPath: string, taskId: string): string {
		return join(this.getTaskDirectory(projectPath, taskId), `${taskId}_dimension.md`);
	}
	/**
	 * 保存LLM生成的评价维度标准（增强版）
	 */
	async saveDimensionStandards(projectPath: string, taskId: string, task: any, generatedDimensions: string): Promise<string> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			const dimensionPath = this.getDimensionPath(projectPath, taskId);
			
			// 确保任务目录存在，多重检查
			await fs.mkdir(taskDir, { recursive: true });
			
			// 验证目录确实创建成功
			const dirStats = await fs.stat(taskDir);
			if (!dirStats.isDirectory()) {
				throw new Error(`任务目录创建失败: ${taskDir}`);
			}
			
			// 生成完整的评价标准文档
			const standardsContent = `# 质量评价标准

## 📋 任务信息
- **任务ID**: ${taskId}
- **创建时间**: ${new Date().toLocaleString('zh-CN')}
- **核心任务**: ${task.coreTask || '未指定'}
- **任务类型**: ${task.taskType || '未指定'}
- **复杂度**: ${task.complexity || 'N/A'}/5
- **领域**: ${task.domain || '未指定'}

## 🎯 任务目标
${task.objectives ? task.objectives.map((obj: any) => `- ${obj}`).join('\n') : '无'}

## 🔑 关键要素
${task.keyElements ? task.keyElements.map((elem: any) => `- ${elem}`).join('\n') : '无'}

---

## ⭐ 评价维度标准

${generatedDimensions}

---

## 📊 使用说明

### 评分方式
- **分数范围**: 每个维度可给0-10分任意数字（包括小数点）
- **参考标准**: 6分及格、8分优秀、10分卓越
- **最终分数**: 所有维度得分的平均值
- **评分要求**: 请根据实际完成情况严格按照上述标准评分

### 文档信息
- **生成时间**: ${new Date().toISOString()}
- **文档类型**: QDG质量评价标准（完整版本）
- **任务ID**: ${taskId}
- **状态**: ✅ 已完成标准制定，可开始任务执行

---

*本文档由 Quality Dimension Generator 自动生成和保存*
`;
			
			// 写入文件，确保编码正确
			await fs.writeFile(dimensionPath, standardsContent, { encoding: 'utf-8' });
			
			// 验证文件确实写入成功
			const fileStats = await fs.stat(dimensionPath);
			if (fileStats.size === 0) {
				throw new Error('文件写入失败：文件大小为0');
			}
			
			// 验证文件内容
			const savedContent = await fs.readFile(dimensionPath, 'utf-8');
			if (!savedContent.includes(taskId) || !savedContent.includes(generatedDimensions)) {
				throw new Error('文件内容验证失败：保存的内容不完整');
			}
			
			console.log(`✅ 评价标准已成功保存: ${dimensionPath} (${fileStats.size} bytes)`);
			return dimensionPath;
			
		} catch (error) {
			console.error('❌ 保存评价标准失败:', error);
			throw new Error(`保存评价标准失败: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * 读取已保存的评价标准
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
	 * 获取 QDG 配置
	 */
	async getQdgConfig(projectPath: string): Promise<any> {
		const dirs = this.getSubDirectories(projectPath);
		const configPath = join(dirs.config, 'qdg.config.json');
		
		try {
			const content = await fs.readFile(configPath, 'utf-8');
			return JSON.parse(content);
		} catch {
			// 返回默认配置（只包含设置项）
			return {
				settings: {
					dimensionCount: 5,    // 默认5个维度
					expectedScore: 8      // 默认期望8分
				}
			};
		}
	}

	/**
	 * 保存简洁的单文件输出：纯净的任务描述和评价维度
	 */
	async saveCleanOutput(
		projectPath: string, 
		taskId: string, 
		refinedTaskDescription: string, 
		dimensionsContent: string
	): Promise<string> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			
			// 确保任务目录存在
			await fs.mkdir(taskDir, { recursive: true });
			
			// 定义输出文件路径
			const outputFilePath = join(taskDir, `${taskId}_output.md`);
			
			// 创建简洁的文件内容：只包含纯净的两个输出
			const cleanContent = `# 任务描述

${refinedTaskDescription}

---

# 评价维度

${dimensionsContent}`;
			
			// 写入文件
			await fs.writeFile(outputFilePath, cleanContent, { encoding: 'utf-8' });
			
			// 验证文件创建成功
			const fileStats = await fs.stat(outputFilePath);
			
			if (fileStats.size === 0) {
				throw new Error('文件写入失败：文件大小为0');
			}
			
			console.log(`✅ 简洁输出已保存: ${outputFilePath} (${fileStats.size} 字节)`);
			
			return outputFilePath;
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error('❌ 保存简洁输出失败:', errorMessage);
			throw new Error(`保存简洁输出失败: ${errorMessage}`);
		}
	}

	/**
	 * 保存双文件输出：任务描述和评价维度的纯净版本
	 * 返回两个独立的md文件路径
	 */
	async saveDualOutputFiles(
		projectPath: string, 
		taskId: string, 
		refinedTaskDescription: string, 
		dimensionsContent: string
	): Promise<{ taskFilePath: string; dimensionsFilePath: string }> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			
			// 确保任务目录存在
			await fs.mkdir(taskDir, { recursive: true });
			
			// 定义两个文件路径
			const taskFilePath = join(taskDir, `${taskId}_task.md`);
			const dimensionsFilePath = join(taskDir, `${taskId}_dimensions.md`);
			
			// 创建纯净的任务描述文件
			const taskContent = refinedTaskDescription;
			
			// 创建纯净的评价维度文件
			const dimensionsFileContent = dimensionsContent;
			
			// 并行写入两个文件
			await Promise.all([
				fs.writeFile(taskFilePath, taskContent, { encoding: 'utf-8' }),
				fs.writeFile(dimensionsFilePath, dimensionsFileContent, { encoding: 'utf-8' })
			]);
			
			// 验证文件创建成功
			const [taskStats, dimensionsStats] = await Promise.all([
				fs.stat(taskFilePath),
				fs.stat(dimensionsFilePath)
			]);
			
			if (taskStats.size === 0 || dimensionsStats.size === 0) {
				throw new Error('文件写入失败：文件大小为0');
			}
			
			console.log(`✅ 双文件输出已保存:`);
			console.log(`📄 任务文件: ${taskFilePath} (${taskStats.size} 字节)`);
			console.log(`⭐ 维度文件: ${dimensionsFilePath} (${dimensionsStats.size} 字节)`);
			
			return { taskFilePath, dimensionsFilePath };
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error('❌ 保存双文件输出失败:', errorMessage);
			throw new Error(`保存双文件输出失败: ${errorMessage}`);
		}
	}

	/**
	 * 保存最终的评价维度标准（专用于save_quality_dimensions工具）
	 */
	async saveFinalDimensionStandards(projectPath: string, taskId: string, task: any, refinedTaskDescription: string, dimensionsContent: string): Promise<string> {
		try {
			const taskDir = this.getTaskDirectory(projectPath, taskId);
			const dimensionPath = this.getDimensionPath(projectPath, taskId);
			
			// 确保任务目录存在
			await fs.mkdir(taskDir, { recursive: true });
			
			// 验证目录创建成功
			const dirStats = await fs.stat(taskDir);
			if (!dirStats.isDirectory()) {
				throw new Error(`任务目录创建失败: ${taskDir}`);
			}
			
			// 生成最终的评价标准文档（包含两个LLM输出）
			const finalContent = `# 质量评价标准

## 📋 任务提炼（第一个环节输出）

${refinedTaskDescription}

---

## ⭐ 评价维度体系（第二个环节输出）

${dimensionsContent}

---

## � 使用说明

**任务ID**: ${taskId}  
**生成时间**: ${new Date().toLocaleString('zh-CN')}

**评分方式**: 每个维度可给0-10分任意数字（包括小数点）  
**参考标准**: 6分及格、8分优秀、10分卓越  
**最终分数**: 所有维度得分的平均值

**状态**: ✅ 任务提炼和评价标准已完成，可开始执行任务

---

*Quality Dimension Generator - 双环节输出完整版*
`;
			
			// 写入最终文件
			await fs.writeFile(dimensionPath, finalContent, { encoding: 'utf-8' });
			
			// 验证文件写入成功并读取确认
			const fileStats = await fs.stat(dimensionPath);
			
			if (fileStats.size === 0) {
				throw new Error('文件写入失败：文件大小为0');
			}
			
			console.log(`✅ 最终评价标准已保存: ${dimensionPath} (${fileStats.size} 字节)`);
			return dimensionPath;
			
		} catch (error) {
			console.error('保存最终评价标准失败:', error);
			throw new Error(`保存最终评价标准失败: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}