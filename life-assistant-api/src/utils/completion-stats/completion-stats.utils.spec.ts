import {
  filterExcludedStatuses,
  countAffirmativeCompletions,
  calculateCompletionRate,
  isTaskCompleted,
  TaskWithStatus,
} from './index';

describe('completion-stats.utils', () => {
  describe('filterExcludedStatuses', () => {
    it('should filter out tasks with "in progress" status', () => {
      const tasks: TaskWithStatus[] = [
        { status: { status: 'in progress', type: 'open' } },
        { status: { status: 'complete', type: 'done' } },
        { status: { status: 'In Progress', type: 'open' } }, // case insensitive
        { status: { status: 'todo', type: 'open' } },
      ];

      const result = filterExcludedStatuses(tasks);

      expect(result).toHaveLength(2);
      expect(result[0].status?.status).toBe('complete');
      expect(result[1].status?.status).toBe('todo');
    });

    it('should handle tasks without status', () => {
      const tasks: TaskWithStatus[] = [
        { status: undefined },
        { status: { status: 'complete' } },
      ];

      const result = filterExcludedStatuses(tasks);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      expect(filterExcludedStatuses([])).toEqual([]);
    });
  });

  describe('countAffirmativeCompletions', () => {
    it('should count tasks with affirmative statuses', () => {
      const tasks: TaskWithStatus[] = [
        { status: { status: 'complete' } },
        { status: { status: 'completed' } },
        { status: { status: 'went' } },
        { status: { status: 'attended' } },
        { status: { status: 'skipped' } },
        { status: { status: 'todo' } },
      ];

      expect(countAffirmativeCompletions(tasks)).toBe(4);
    });

    it('should be case insensitive', () => {
      const tasks: TaskWithStatus[] = [
        { status: { status: 'Complete' } },
        { status: { status: 'COMPLETED' } },
        { status: { status: 'Went' } },
      ];

      expect(countAffirmativeCompletions(tasks)).toBe(3);
    });

    it('should handle tasks without status', () => {
      const tasks: TaskWithStatus[] = [
        { status: undefined },
        { status: { status: undefined } },
        { status: { status: 'complete' } },
      ];

      expect(countAffirmativeCompletions(tasks)).toBe(1);
    });

    it('should return 0 for empty input', () => {
      expect(countAffirmativeCompletions([])).toBe(0);
    });
  });

  describe('calculateCompletionRate', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateCompletionRate(5, 10)).toBe(50);
      expect(calculateCompletionRate(3, 4)).toBe(75);
      expect(calculateCompletionRate(10, 10)).toBe(100);
      expect(calculateCompletionRate(0, 10)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculateCompletionRate(1, 3)).toBe(33);
      expect(calculateCompletionRate(2, 3)).toBe(67);
    });

    it('should return 0 when total is 0', () => {
      expect(calculateCompletionRate(0, 0)).toBe(0);
    });
  });

  describe('isTaskCompleted', () => {
    it('should return true for done type', () => {
      expect(isTaskCompleted({ status: { type: 'done' } })).toBe(true);
    });

    it('should return true for closed type', () => {
      expect(isTaskCompleted({ status: { type: 'closed' } })).toBe(true);
    });

    it('should return false for open type', () => {
      expect(isTaskCompleted({ status: { type: 'open' } })).toBe(false);
    });

    it('should return false for tasks without status', () => {
      expect(isTaskCompleted({ status: undefined })).toBe(false);
      expect(isTaskCompleted({})).toBe(false);
    });
  });
});
