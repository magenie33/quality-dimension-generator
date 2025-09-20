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
			// 文件不存在，创建默认配置（只包含可配置项）
			const defaultConfig = {
				version: "1.0.0",
				created: new Date().toISOString(),
				settings: {
					// 可配置项
					dimensionCount: 5, // 默认5个维度
					expectedScore: 8   // 默认期望8分
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
	 * 保存LLM生成的评价维度标准
	 */
	async saveDimensionStandards(projectPath: string, taskId: string, task: any, generatedDimensions: string): Promise<string> {
		const taskDir = this.getTaskDirectory(projectPath, taskId);
		const dimensionPath = this.getDimensionPath(projectPath, taskId);
		
		// 确保任务目录存在
		await fs.mkdir(taskDir, { recursive: true });
		
		// 生成完整的评价标准文档
		const standardsContent = `# 质量评价标准

## 任务信息
- **任务ID**: ${taskId}
- **创建时间**: ${new Date().toLocaleString('zh-CN')}
- **核心任务**: ${task.coreTask || '未指定'}
- **任务类型**: ${task.taskType || '未指定'}
- **复杂度**: ${task.complexity || 'N/A'}/5
- **领域**: ${task.domain || '未指定'}

## 任务目标
${task.objectives ? task.objectives.map((obj: any) => `- ${obj}`).join('\n') : '无'}

## 关键要素
${task.keyElements ? task.keyElements.map((elem: any) => `- ${elem}`).join('\n') : '无'}

---

${generatedDimensions}

---

## 使用说明

1. **评分方式**: 每个维度可给0-10分任意数字（包括小数点）
2. **参考标准**: 6分及格、8分优秀、10分卓越
3. **最终分数**: 所有维度得分的平均值
4. **评分要求**: 请根据实际完成情况严格按照上述标准评分

**生成时间**: ${new Date().toISOString()}
**文档类型**: QDG质量评价标准
`;
		
		await fs.writeFile(dimensionPath, standardsContent, 'utf-8');
		return dimensionPath;
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
			// 返回默认配置（只包含可配置项）
			return {
				settings: {
					dimensionCount: 5, // 默认5个维度
					expectedScore: 8   // 默认期望8分
				}
			};
		}
	}
}