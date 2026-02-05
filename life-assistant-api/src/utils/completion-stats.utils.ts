/**
 * Utility functions for calculating task completion statistics
 */

import { AFFIRMATIVE_STATUSES, EXCLUDED_STATUSES } from './constants';

export interface TaskWithStatus {
  status?: {
    status?: string;
    type?: string;
  };
}

/**
 * Filter out tasks with excluded statuses (e.g., "in progress")
 * These shouldn't count against completion rate
 */
export function filterExcludedStatuses<T extends TaskWithStatus>(
  tasks: T[],
): T[] {
  return tasks.filter(
    (task) =>
      !EXCLUDED_STATUSES.includes(
        task.status?.status?.toLowerCase() as (typeof EXCLUDED_STATUSES)[number],
      ),
  );
}

/**
 * Count tasks with affirmative completion statuses
 * (e.g., "complete", "completed", "went", "attended")
 */
export function countAffirmativeCompletions<T extends TaskWithStatus>(
  tasks: T[],
): number {
  return tasks.filter((task) =>
    AFFIRMATIVE_STATUSES.includes(
      task.status?.status?.toLowerCase() as (typeof AFFIRMATIVE_STATUSES)[number],
    ),
  ).length;
}

/**
 * Calculate completion rate as a percentage (0-100)
 */
export function calculateCompletionRate(
  completed: number,
  total: number,
): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Check if a task is in a "done" or "closed" state
 */
export function isTaskCompleted<T extends TaskWithStatus>(task: T): boolean {
  return task.status?.type === 'done' || task.status?.type === 'closed';
}
