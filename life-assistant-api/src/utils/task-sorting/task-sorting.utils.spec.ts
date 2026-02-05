import { getTimeOfDayOrder, sortByTimeOfDay, TaskWithTimeOfDay } from './index';

describe('task-sorting.utils', () => {
  describe('getTimeOfDayOrder', () => {
    it('should return correct order for known time of day values', () => {
      expect(getTimeOfDayOrder('early morning')).toBe(1);
      expect(getTimeOfDayOrder('morning')).toBe(2);
      expect(getTimeOfDayOrder('mid day')).toBe(3);
      expect(getTimeOfDayOrder('evening')).toBe(4);
      expect(getTimeOfDayOrder('before bed')).toBe(5);
    });

    it('should be case insensitive', () => {
      expect(getTimeOfDayOrder('Early Morning')).toBe(1);
      expect(getTimeOfDayOrder('MORNING')).toBe(2);
      expect(getTimeOfDayOrder('Mid Day')).toBe(3);
    });

    it('should return default order for null', () => {
      expect(getTimeOfDayOrder(null)).toBe(99);
    });

    it('should return default order for unknown values', () => {
      expect(getTimeOfDayOrder('unknown')).toBe(99);
      expect(getTimeOfDayOrder('midnight')).toBe(99);
    });
  });

  describe('sortByTimeOfDay', () => {
    it('should sort tasks by time of day order', () => {
      const tasks: TaskWithTimeOfDay[] = [
        { timeOfDay: { name: 'evening', color: '#ff0' } },
        { timeOfDay: { name: 'early morning', color: '#ff0' } },
        { timeOfDay: { name: 'mid day', color: '#ff0' } },
        { timeOfDay: { name: 'morning', color: '#ff0' } },
        { timeOfDay: { name: 'before bed', color: '#ff0' } },
      ];

      const result = sortByTimeOfDay(tasks);

      expect(result.map((t) => t.timeOfDay?.name)).toEqual([
        'early morning',
        'morning',
        'mid day',
        'evening',
        'before bed',
      ]);
    });

    it('should sort tasks without time of day to the end', () => {
      const tasks: TaskWithTimeOfDay[] = [
        { timeOfDay: null },
        { timeOfDay: { name: 'morning', color: '#ff0' } },
        { timeOfDay: null },
        { timeOfDay: { name: 'evening', color: '#ff0' } },
      ];

      const result = sortByTimeOfDay(tasks);

      expect(result[0].timeOfDay?.name).toBe('morning');
      expect(result[1].timeOfDay?.name).toBe('evening');
      expect(result[2].timeOfDay).toBeNull();
      expect(result[3].timeOfDay).toBeNull();
    });

    it('should not mutate the original array', () => {
      const tasks: TaskWithTimeOfDay[] = [
        { timeOfDay: { name: 'evening', color: '#ff0' } },
        { timeOfDay: { name: 'morning', color: '#ff0' } },
      ];

      const result = sortByTimeOfDay(tasks);

      expect(result).not.toBe(tasks);
      expect(tasks[0].timeOfDay?.name).toBe('evening');
    });

    it('should handle empty array', () => {
      expect(sortByTimeOfDay([])).toEqual([]);
    });

    it('should preserve additional properties on tasks', () => {
      interface ExtendedTask extends TaskWithTimeOfDay {
        id: string;
        name: string;
      }

      const tasks: ExtendedTask[] = [
        {
          id: '1',
          name: 'Task 1',
          timeOfDay: { name: 'evening', color: '#ff0' },
        },
        {
          id: '2',
          name: 'Task 2',
          timeOfDay: { name: 'morning', color: '#ff0' },
        },
      ];

      const result = sortByTimeOfDay(tasks);

      expect(result[0]).toMatchObject({ id: '2', name: 'Task 2' });
      expect(result[1]).toMatchObject({ id: '1', name: 'Task 1' });
    });
  });
});
