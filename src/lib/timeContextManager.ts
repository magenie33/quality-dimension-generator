import { TimeContext } from './types.js';

/**
 * 时间上下文管理器 - 简化版
 * 只提供基本的时间和时区信息，不做主观判断
 */
export class TimeContextManager {
	/**
	 * 获取当前时间上下文
	 */
	public getCurrentTimeContext(timezone?: string, locale = 'zh-CN'): TimeContext {
		const now = new Date();
		
		// 如果指定了时区，则转换时间
		const targetTime = timezone ? this.convertToTimezone(now, timezone) : now;
		
		return {
			timestamp: targetTime.getTime(),
			formattedTime: this.formatDateTime(targetTime, locale),
			timezone: timezone || this.getSystemTimezone(),
			year: targetTime.getFullYear(),
			month: targetTime.getMonth() + 1, // JavaScript 月份从0开始
			day: targetTime.getDate(),
			weekday: this.getWeekdayName(targetTime, locale)
		};
	}

	/**
	 * 转换到指定时区
	 */
	private convertToTimezone(date: Date, timezone: string): Date {
		try {
			// 使用 Intl.DateTimeFormat 进行时区转换
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			});

			const parts = formatter.formatToParts(date);
			const partsObj = parts.reduce((acc, part) => {
				acc[part.type] = part.value;
				return acc;
			}, {} as Record<string, string>);

			return new Date(
				parseInt(partsObj.year),
				parseInt(partsObj.month) - 1,
				parseInt(partsObj.day),
				parseInt(partsObj.hour),
				parseInt(partsObj.minute),
				parseInt(partsObj.second)
			);
		} catch (error) {
			console.warn(`Invalid timezone: ${timezone}, using system timezone`);
			return date;
		}
	}

	/**
	 * 获取系统时区
	 */
	private getSystemTimezone(): string {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch {
			return 'UTC';
		}
	}

	/**
	 * 格式化日期时间
	 */
	private formatDateTime(date: Date, locale: string): string {
		try {
			return new Intl.DateTimeFormat(locale, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				weekday: 'long',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				timeZoneName: 'short'
			}).format(date);
		} catch {
			// 如果本地化失败，使用默认格式
			return date.toLocaleString();
		}
	}

	/**
	 * 获取星期几名称
	 */
	private getWeekdayName(date: Date, locale: string): string {
		try {
			return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
		} catch {
			const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
			return weekdays[date.getDay()];
		}
	}
}