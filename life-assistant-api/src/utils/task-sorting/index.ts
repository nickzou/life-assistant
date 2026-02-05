/**
 * Utility functions for sorting tasks
 */

import { TIME_OF_DAY_ORDER, DEFAULT_TIME_OF_DAY_ORDER } from '../constants';

export interface TaskWithTimeOfDay {
  timeOfDay: {
    name: string;
    color: string;
  } | null;
}

/**
 * Get the sort order for a Time of Day value
 */
export function getTimeOfDayOrder(timeOfDayName: string | null): number {
  if (!timeOfDayName) return DEFAULT_TIME_OF_DAY_ORDER;
  return (
    TIME_OF_DAY_ORDER[timeOfDayName.toLowerCase()] || DEFAULT_TIME_OF_DAY_ORDER
  );
}

/**
 * Sort tasks by their Time of Day field
 * Tasks without a Time of Day are sorted last
 */
export function sortByTimeOfDay<T extends TaskWithTimeOfDay>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aOrder = getTimeOfDayOrder(a.timeOfDay?.name || null);
    const bOrder = getTimeOfDayOrder(b.timeOfDay?.name || null);
    return aOrder - bOrder;
  });
}
