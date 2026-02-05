/**
 * Status constants for ClickUp task completion tracking
 */

// Affirmative completion statuses (green - actually completed)
export const AFFIRMATIVE_STATUSES = [
  'complete',
  'completed',
  'went',
  'attended',
] as const;

// Statuses to exclude from total count (still in progress, shouldn't count against rate)
export const EXCLUDED_STATUSES = ['in progress'] as const;

export type AffirmativeStatus = (typeof AFFIRMATIVE_STATUSES)[number];
export type ExcludedStatus = (typeof EXCLUDED_STATUSES)[number];
