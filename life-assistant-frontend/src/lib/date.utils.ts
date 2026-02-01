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

/**
 * Get the start of the week (Sunday) for a given date.
 * Returns a new Date object set to Sunday 00:00:00 of that week.
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get an array of 7 YYYY-MM-DD strings for a week starting from the given date.
 */
export function getWeekDates(startDate: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(formatDateString(d));
  }
  return dates;
}

/**
 * Format a week range as a human-readable string (e.g., "Jan 27 - Feb 2, 2026")
 */
export function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  // If same month, don't repeat month name
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}
