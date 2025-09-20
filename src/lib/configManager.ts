import { promises as fs } from 'fs';
import { join } from 'path';
import { QdgDirectoryManager } from './qdgDirectoryManager.js';

/**
 * 配置管理器接口
 */
export interface QdgConfig {
	version: string;
	created: string;
	settings: {
		// 可配置项
		dimensionCount: number; // 维度数量，默认5
		expectedScore: number;  // 期望分数，默认8（0-10分）
		
		// 以下都是固定的，不可配置
		dimensionFormat: 'markdown'; // 固定使用markdown格式
		scoringSystem: 'single-dimension-0-10'; // 固定：单维度0-10分制
		scoreStandards: 'three-tier-guidance'; // 固定：三档次指导说明 (6分及格, 8分优秀, 10分卓越)
		finalScoreMethod: 'average'; // 固定：所有维度均分
		
		// 文件设置
		defaultIncludePatterns: string[];
		defaultExcludePatterns: string[];
		retainTaskDays: number;
	};
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: QdgConfig = {
	version: "1.0.0",
	created: new Date().toISOString(),
	settings: {
		// 可配置项
		dimensionCount: 5, // 默认5个维度
		expectedScore: 8,  // 默认期望8分
		
		// 以下都是固定值，不可配置
		dimensionFormat: "markdown",
		scoringSystem: "single-dimension-0-10",
		scoreStandards: "three-tier-guidance", // 6分(及格)、8分(优秀)、10分(卓越)
		finalScoreMethod: "average",
		
		// 文件设置
		defaultIncludePatterns: [
			"**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx",
			"**/*.json", "**/*.md", "**/*.yml", "**/*.yaml"
		],
		defaultExcludePatterns: [
			"**/node_modules/**", "**/dist/**", "**/build/**",
			"**/.git/**", "**/coverage/**", "**/.qdg/**"
		],
		retainTaskDays: 30
	}
};

/**
 * 配置管理器
 * 负责读取、写入和验证项目配置
 */
export class ConfigManager {
	private qdgManager: QdgDirectoryManager;
	
	constructor() {
		this.qdgManager = new QdgDirectoryManager();
	}
	
	/**
	 * 获取项目配置
	 */
	async getConfig(projectPath: string): Promise<QdgConfig> {
		try {
			const dirs = this.qdgManager.getSubDirectories(projectPath);
			const configPath = join(dirs.config, 'qdg.config.json');
			
			const content = await fs.readFile(configPath, 'utf-8');
			const config = JSON.parse(content) as QdgConfig;
			
			// 验证和合并默认配置
			return this.mergeWithDefaults(config);
		} catch {
			// 配置文件不存在或损坏，返回默认配置
			return { ...DEFAULT_CONFIG };
		}
	}
	
	/**
	 * 保存项目配置
	 */
	async saveConfig(projectPath: string, config: Partial<QdgConfig>): Promise<void> {
		// 确保 .qdg 目录存在
		await this.qdgManager.initializeQdgDirectory(projectPath);
		
		// 获取当前配置并合并
		const currentConfig = await this.getConfig(projectPath);
		const mergedConfig = this.deepMerge(currentConfig, config);
		
		const dirs = this.qdgManager.getSubDirectories(projectPath);
		const configPath = join(dirs.config, 'qdg.config.json');
		
		await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
	}
	
	/**
	 * 更新维度数量
	 */
	async updateDimensionCount(projectPath: string, count: number): Promise<void> {
		if (count < 1 || count > 10) {
			throw new Error('维度数量必须在1-10之间');
		}
		const config = await this.getConfig(projectPath);
		config.settings.dimensionCount = count;
		await this.saveConfig(projectPath, config);
	}
	
	/**
	 * 更新期望分数
	 */
	async updateExpectedScore(projectPath: string, score: number): Promise<void> {
		if (score < 0 || score > 10) {
			throw new Error('期望分数必须在0-10之间');
		}
		const config = await this.getConfig(projectPath);
		config.settings.expectedScore = score;
		await this.saveConfig(projectPath, config);
	}
	
	/**
	 * 获取维度数量设置
	 */
	async getDimensionCount(projectPath: string): Promise<number> {
		const config = await this.getConfig(projectPath);
		return config.settings.dimensionCount;
	}
	
	/**
	 * 设置维度数量
	 */
	async setDimensionCount(projectPath: string, count: number): Promise<void> {
		await this.updateDimensionCount(projectPath, count);
	}
	
	/**
	 * 获取期望分数设置
	 */
	async getExpectedScore(projectPath: string): Promise<number> {
		const config = await this.getConfig(projectPath);
		return config.settings.expectedScore;
	}
	
	/**
	 * 设置期望分数
	 */
	async setExpectedScore(projectPath: string, score: number): Promise<void> {
		await this.updateExpectedScore(projectPath, score);
	}

	/**
	 * 获取评分系统设置（固定值）
	 */
	getScoringSettings(): {
		scoringSystem: 'single-dimension-0-10';
		scoreStandards: 'three-tier-guidance';
		finalScoreMethod: 'average';
	} {
		return {
			scoringSystem: 'single-dimension-0-10',
			scoreStandards: 'three-tier-guidance',
			finalScoreMethod: 'average'
		};
	}
	
	/**
	 * 验证配置有效性（验证dimensionCount和expectedScore）
	 */
	validateConfig(config: Partial<QdgConfig>): string[] {
		const errors: string[] = [];
		
		if (config.settings?.dimensionCount !== undefined) {
			const count = config.settings.dimensionCount;
			if (typeof count !== 'number' || count < 1 || count > 10) {
				errors.push('维度数量必须是1-10之间的数字');
			}
		}
		
		if (config.settings?.expectedScore !== undefined) {
			const score = config.settings.expectedScore;
			if (typeof score !== 'number' || score < 0 || score > 10) {
				errors.push('期望分数必须是0-10之间的数字');
			}
		}
		
		return errors;
	}
	
	/**
	 * 合并默认配置
	 */
	private mergeWithDefaults(config: Partial<QdgConfig>): QdgConfig {
		return this.deepMerge(DEFAULT_CONFIG, config);
	}
	
	/**
	 * 深度合并对象
	 */
	private deepMerge<T>(target: T, source: Partial<T>): T {
		const result = { ...target };
		
		for (const key in source) {
			if (source[key] !== undefined) {
				if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
					result[key] = this.deepMerge(result[key], source[key] as any);
				} else {
					result[key] = source[key] as any;
				}
			}
		}
		
		return result;
	}
	
	/**
	 * 获取默认配置
	 */
	getDefaultConfig(): QdgConfig {
		return { ...DEFAULT_CONFIG };
	}
}