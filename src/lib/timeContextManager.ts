import { TimeContext } from './types.js';

/**
 * Time Context Manager
 * Provides basic time and timezone information
 */
export class TimeContextManager {
	/**
	 * Get current time context
	 */
	public getCurrentTimeContext(timezone?: string, locale = 'en-US'): TimeContext {
		const now = new Date();
		
		// Convert time if timezone is specified
		const targetTime = timezone ? this.convertToTimezone(now, timezone) : now;
		
		return {
			timestamp: targetTime.getTime(),
			formattedTime: this.formatDateTime(targetTime, locale),
			timezone: timezone || this.getSystemTimezone(),
			year: targetTime.getFullYear(),
			month: targetTime.getMonth() + 1, // JavaScript months start from 0
			day: targetTime.getDate(),
			weekday: this.getWeekdayName(targetTime, locale)
		};
	}

	/**
	 * Convert to specified timezone
	 */
	private convertToTimezone(date: Date, timezone: string): Date {
		try {
			// Use Intl.DateTimeFormat for timezone conversion
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
	 * Get system timezone
	 */
	private getSystemTimezone(): string {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch {
			return 'UTC';
		}
	}

	/**
	 * Format date and time
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
			// Use default format if localization fails
			return date.toLocaleString();
		}
	}

	/**
	 * Get weekday name
	 */
	private getWeekdayName(date: Date, locale: string): string {
		try {
			return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
		} catch {
			const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			return weekdays[date.getDay()];
		}
	}
}