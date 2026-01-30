/**
 * Date utilities for consistent date handling across the frontend.
 * Uses local browser timezone (user's timezone).
 */

/**
 * Get today's date as YYYY-MM-DD string using local date parts.
 * Use this instead of `new Date().toISOString().split('T')[0]`
 * which converts to UTC and can show the wrong day.
 */
export function getTodayString(): string {
  const now = new Date();
  return formatDateString(now);
}

/**
 * Format a Date object as YYYY-MM-DD string using local date parts.
 * Avoids UTC conversion that happens with toISOString().
 */
export function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
