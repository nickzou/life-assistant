/**
 * Time of Day constants for ClickUp task sorting
 */

// Custom field name for Time of Day in ClickUp
export const TIME_OF_DAY_FIELD_NAME = 'time of day';

// Sort order for Time of Day values (lower = earlier in day)
export const TIME_OF_DAY_ORDER: Record<string, number> = {
  'early morning': 1,
  morning: 2,
  'mid day': 3,
  evening: 4,
  'before bed': 5,
};

// Default sort order for tasks without Time of Day
export const DEFAULT_TIME_OF_DAY_ORDER = 99;
