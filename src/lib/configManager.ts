import { promises as fs } from 'fs';
import { join } from 'path';
import { QdgDirectoryManager } from './qdgDirectoryManager.js';

/**
 * Configuration Manager Interface
 */
export interface QdgConfig {
	version: string;
	created: string;
	settings: {
		// Configurable items
		dimensionCount: number; // Number of dimensions, default 5
		expectedScore: number;  // Expected score, default 8 (0-10 scale)
		
		// Following are fixed, not configurable
		dimensionFormat: 'markdown'; // Fixed: use markdown format
		scoringSystem: 'single-dimension-0-10'; // Fixed: single dimension 0-10 scale
		scoreStandards: 'three-tier-guidance'; // Fixed: three-tier guidance (6 pass, 8 good, 10 excellent)
		finalScoreMethod: 'average'; // Fixed: average of all dimensions
		
		// File settings
		defaultIncludePatterns: string[];
		defaultExcludePatterns: string[];
		retainTaskDays: number;
	};
}

/**
 * Default Configuration
 */
const DEFAULT_CONFIG: QdgConfig = {
	version: "1.0.0",
	created: new Date().toISOString(),
	settings: {
		// Configurable items
		dimensionCount: 5, // Default 5 dimensions
		expectedScore: 8,  // Default expected score 8
		
		// Following are fixed values, not configurable
		dimensionFormat: "markdown",
		scoringSystem: "single-dimension-0-10",
		scoreStandards: "three-tier-guidance", // 6 (pass), 8 (good), 10 (excellent)
		finalScoreMethod: "average",
		
		// File settings
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
 * Configuration Manager
 * Responsible for reading, writing and validating project configuration
 */
export class ConfigManager {
	private qdgManager: QdgDirectoryManager;
	
	constructor() {
		this.qdgManager = new QdgDirectoryManager();
	}
	
	/**
	 * Get project configuration
	 */
	async getConfig(projectPath: string): Promise<QdgConfig> {
		try {
			const dirs = this.qdgManager.getSubDirectories(projectPath);
			const configPath = join(dirs.config, 'qdg.config.json');
			
			const content = await fs.readFile(configPath, 'utf-8');
			const config = JSON.parse(content) as QdgConfig;
			
			// Validate and merge with defaults
			return this.mergeWithDefaults(config);
		} catch {
			// Config file doesn't exist or is corrupted, return default config
			return { ...DEFAULT_CONFIG };
		}
	}
	
	/**
	 * Save project configuration
	 */
	async saveConfig(projectPath: string, config: Partial<QdgConfig>): Promise<void> {
		// Ensure .qdg directory exists
		await this.qdgManager.initializeQdgDirectory(projectPath);
		
		// Get current config and merge
		const currentConfig = await this.getConfig(projectPath);
		const mergedConfig = this.deepMerge(currentConfig, config);
		
		const dirs = this.qdgManager.getSubDirectories(projectPath);
		const configPath = join(dirs.config, 'qdg.config.json');
		
		await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
	}
	
	/**
	 * Update dimension count
	 */
	async updateDimensionCount(projectPath: string, count: number): Promise<void> {
		if (count < 1 || count > 10) {
			throw new Error('Dimension count must be between 1-10');
		}
		const config = await this.getConfig(projectPath);
		config.settings.dimensionCount = count;
		await this.saveConfig(projectPath, config);
	}
	
	/**
	 * Update expected score
	 */
	async updateExpectedScore(projectPath: string, score: number): Promise<void> {
		if (score < 0 || score > 10) {
			throw new Error('Expected score must be between 0-10');
		}
		const config = await this.getConfig(projectPath);
		config.settings.expectedScore = score;
		await this.saveConfig(projectPath, config);
	}
	
	/**
	 * Get dimension count setting
	 */
	async getDimensionCount(projectPath: string): Promise<number> {
		const config = await this.getConfig(projectPath);
		return config.settings.dimensionCount;
	}
	
	/**
	 * Set dimension count
	 */
	async setDimensionCount(projectPath: string, count: number): Promise<void> {
		await this.updateDimensionCount(projectPath, count);
	}
	
	/**
	 * Get expected score setting
	 */
	async getExpectedScore(projectPath: string): Promise<number> {
		const config = await this.getConfig(projectPath);
		return config.settings.expectedScore;
	}
	
	/**
	 * Set expected score
	 */
	async setExpectedScore(projectPath: string, score: number): Promise<void> {
		await this.updateExpectedScore(projectPath, score);
	}

	/**
	 * Get scoring system settings (fixed values)
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
	 * Validate configuration validity (validate dimensionCount and expectedScore)
	 */
	validateConfig(config: Partial<QdgConfig>): string[] {
		const errors: string[] = [];
		
		if (config.settings?.dimensionCount !== undefined) {
			const count = config.settings.dimensionCount;
			if (typeof count !== 'number' || count < 1 || count > 10) {
				errors.push('Dimension count must be a number between 1-10');
			}
		}
		
		if (config.settings?.expectedScore !== undefined) {
			const score = config.settings.expectedScore;
			if (typeof score !== 'number' || score < 0 || score > 10) {
				errors.push('Expected score must be a number between 0-10');
			}
		}
		
		return errors;
	}
	
	/**
	 * Merge with default configuration
	 */
	private mergeWithDefaults(config: Partial<QdgConfig>): QdgConfig {
		return this.deepMerge(DEFAULT_CONFIG, config);
	}
	
	/**
	 * Deep merge objects
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
	 * Get default configuration
	 */
	getDefaultConfig(): QdgConfig {
		return { ...DEFAULT_CONFIG };
	}
}