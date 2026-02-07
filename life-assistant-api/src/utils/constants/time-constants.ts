/**
 * Time of Day constants for task sorting and display
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

// Time of Day options with colors (for annotation-based timeOfDay on non-ClickUp tasks)
export const TIME_OF_DAY_OPTIONS: { name: string; color: string }[] = [
  { name: 'early morning', color: '#6B7280' },
  { name: 'morning', color: '#F59E0B' },
  { name: 'mid day', color: '#3B82F6' },
  { name: 'evening', color: '#8B5CF6' },
  { name: 'before bed', color: '#6366F1' },
];
