/**
 * Timezone utilities for consistent date handling across the application.
 * All date calculations use America/New_York timezone.
 */

const TIMEZONE = 'America/New_York';

/**
 * Get current date/time in America/New_York timezone.
 * Use this instead of `new Date()` when the local date matters.
 */
export function getNowInTimezone(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Get today's date as YYYY-MM-DD string in America/New_York timezone.
 * Use this instead of `new Date().toISOString().split('T')[0]`.
 */
export function getTodayString(): string {
  const now = getNowInTimezone();
  return formatDateString(now);
}

/**
 * Format a Date object as YYYY-MM-DD string using local date parts.
 * Avoids UTC conversion that happens with toISOString().
 */
export function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
