import { promises as fs } from 'fs';
import { join } from 'path';
import { QdgDirectoryManager } from './qdgDirectoryManager.js';

/**
 * Configuration Manager Interface
 */
export interface QdgConfig {
	dimensionCount: number; // Number of dimensions, default 5
	expectedScore: number;  // Expected score, default 8 (0-10 scale)
}

/**
 * Default Configuration
 */
const DEFAULT_CONFIG: QdgConfig = {
	dimensionCount: 5, // Default 5 dimensions
	expectedScore: 8   // Default expected score 8
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
			return { ...DEFAULT_CONFIG, ...config };
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
		const mergedConfig = { ...currentConfig, ...config };
		
		const dirs = this.qdgManager.getSubDirectories(projectPath);
		const configPath = join(dirs.config, 'qdg.config.json');
		
		await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
	}
	
	/**
	 * Get dimension count setting
	 */
	async getDimensionCount(projectPath: string): Promise<number> {
		const config = await this.getConfig(projectPath);
		return config.dimensionCount;
	}
	
	/**
	 * Set dimension count
	 */
	async setDimensionCount(projectPath: string, count: number): Promise<void> {
		if (count < 1 || count > 10) {
			throw new Error('Dimension count must be between 1-10');
		}
		const config = await this.getConfig(projectPath);
		config.dimensionCount = count;
		await this.saveConfig(projectPath, config);
	}
	
	/**
	 * Get expected score setting
	 */
	async getExpectedScore(projectPath: string): Promise<number> {
		const config = await this.getConfig(projectPath);
		return config.expectedScore;
	}
	
	/**
	 * Set expected score
	 */
	async setExpectedScore(projectPath: string, score: number): Promise<void> {
		if (score < 0 || score > 10) {
			throw new Error('Expected score must be between 0-10');
		}
		const config = await this.getConfig(projectPath);
		config.expectedScore = score;
		await this.saveConfig(projectPath, config);
	}

	/**
	 * Validate configuration validity
	 */
	validateConfig(config: Partial<QdgConfig>): string[] {
		const errors: string[] = [];
		
		if (config.dimensionCount !== undefined) {
			const count = config.dimensionCount;
			if (typeof count !== 'number' || count < 1 || count > 10) {
				errors.push('Dimension count must be a number between 1-10');
			}
		}
		
		if (config.expectedScore !== undefined) {
			const score = config.expectedScore;
			if (typeof score !== 'number' || score < 0 || score > 10) {
				errors.push('Expected score must be a number between 0-10');
			}
		}
		
		return errors;
	}
	
	/**
	 * Get default configuration
	 */
	getDefaultConfig(): QdgConfig {
		return { ...DEFAULT_CONFIG };
	}
}