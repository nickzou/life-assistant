import { extractTimeOfDay, mapTaskToItem, ClickUpTask } from './index';

describe('task-mappers.utils', () => {
  describe('extractTimeOfDay', () => {
    it('should extract time of day from custom fields', () => {
      const task: ClickUpTask = {
        id: '1',
        name: 'Test',
        url: 'https://clickup.com/t/1',
        custom_fields: [
          {
            name: 'Time of Day',
            value: 1,
            type_config: {
              options: [
                { orderindex: 0, name: 'Morning', color: '#ff0' },
                { orderindex: 1, name: 'Evening', color: '#00f' },
              ],
            },
          },
        ],
      };

      const result = extractTimeOfDay(task);

      expect(result).toEqual({ name: 'Evening', color: '#00f' });
    });

    it('should be case insensitive for field name', () => {
      const task: ClickUpTask = {
        id: '1',
        name: 'Test',
        url: 'https://clickup.com/t/1',
        custom_fields: [
          {
            name: 'TIME OF DAY',
            value: 0,
            type_config: {
              options: [{ orderindex: 0, name: 'Morning', color: '#ff0' }],
            },
          },
        ],
      };

      const result = extractTimeOfDay(task);

      expect(result).toEqual({ name: 'Morning', color: '#ff0' });
    });

    it('should return null when no time of day field exists', () => {
      const task: ClickUpTask = {
        id: '1',
        name: 'Test',
        url: 'https://clickup.com/t/1',
        custom_fields: [{ name: 'Priority', value: 1 }],
      };

      expect(extractTimeOfDay(task)).toBeNull();
    });

    it('should return null when value is undefined', () => {
      const task: ClickUpTask = {
        id: '1',
        name: 'Test',
        url: 'https://clickup.com/t/1',
        custom_fields: [
          {
            name: 'time of day',
            value: undefined,
            type_config: {
              options: [{ orderindex: 0, name: 'Morning', color: '#ff0' }],
            },
          },
        ],
      };

      expect(extractTimeOfDay(task)).toBeNull();
    });

    it('should return null when no matching option found', () => {
      const task: ClickUpTask = {
        id: '1',
        name: 'Test',
        url: 'https://clickup.com/t/1',
        custom_fields: [
          {
            name: 'time of day',
            value: 99, // No option with this orderindex
            type_config: {
              options: [{ orderindex: 0, name: 'Morning', color: '#ff0' }],
            },
          },
        ],
      };

      expect(extractTimeOfDay(task)).toBeNull();
    });

    it('should handle missing custom_fields', () => {
      const task: ClickUpTask = {
        id: '1',
        name: 'Test',
        url: 'https://clickup.com/t/1',
      };

      expect(extractTimeOfDay(task)).toBeNull();
    });
  });

  describe('mapTaskToItem', () => {
    it('should map a full ClickUp task to TaskItem', () => {
      const task: ClickUpTask = {
        id: 'task-123',
        name: 'Test Task',
        parent: 'parent-1',
        list: { id: 'list-1' },
        status: {
          status: 'In Progress',
          type: 'open',
          color: '#0000ff',
        },
        due_date: '1706745600000', // 2024-02-01
        due_date_time: true,
        tags: [{ name: 'urgent' }, { name: 'work' }],
        url: 'https://clickup.com/t/task-123',
        custom_fields: [
          {
            name: 'time of day',
            value: 0,
            type_config: {
              options: [{ orderindex: 0, name: 'Morning', color: '#ffcc00' }],
            },
          },
        ],
      };

      const parentNames = new Map([['parent-1', 'Parent Task']]);
      const result = mapTaskToItem(task, parentNames);

      expect(result).toEqual({
        id: 'task-123',
        name: 'Test Task',
        parentName: 'Parent Task',
        listId: 'list-1',
        status: {
          status: 'In Progress',
          type: 'open',
          color: '#0000ff',
        },
        dueDate: expect.any(String),
        hasDueTime: true,
        tags: ['urgent', 'work'],
        timeOfDay: { name: 'Morning', color: '#ffcc00' },
        url: 'https://clickup.com/t/task-123',
      });
    });

    it('should handle minimal task data', () => {
      const task: ClickUpTask = {
        id: 'task-1',
        name: 'Minimal Task',
        url: 'https://clickup.com/t/1',
      };

      const result = mapTaskToItem(task);

      expect(result).toEqual({
        id: 'task-1',
        name: 'Minimal Task',
        parentName: null,
        listId: '',
        status: {
          status: 'unknown',
          type: 'unknown',
          color: '#gray',
        },
        dueDate: null,
        hasDueTime: false,
        tags: [],
        timeOfDay: null,
        url: 'https://clickup.com/t/1',
      });
    });

    it('should handle parent without matching name', () => {
      const task: ClickUpTask = {
        id: 'task-1',
        name: 'Test',
        parent: 'unknown-parent',
        url: 'https://clickup.com/t/1',
      };

      const parentNames = new Map([['other-parent', 'Other']]);
      const result = mapTaskToItem(task, parentNames);

      expect(result.parentName).toBeNull();
    });

    it('should convert due_date from timestamp to ISO string', () => {
      const task: ClickUpTask = {
        id: 'task-1',
        name: 'Test',
        due_date: '1706745600000',
        url: 'https://clickup.com/t/1',
      };

      const result = mapTaskToItem(task);

      expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle empty tags array', () => {
      const task: ClickUpTask = {
        id: 'task-1',
        name: 'Test',
        tags: [],
        url: 'https://clickup.com/t/1',
      };

      const result = mapTaskToItem(task);

      expect(result.tags).toEqual([]);
    });
  });
});
