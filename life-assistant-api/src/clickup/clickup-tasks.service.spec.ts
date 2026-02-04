import { Test, TestingModule } from '@nestjs/testing';
import { ClickUpTasksService } from './clickup-tasks.service';
import { ClickUpService } from './clickup.service';

describe('ClickUpTasksService', () => {
  let service: ClickUpTasksService;
  let mockClickUpService: any;

  beforeEach(async () => {
    mockClickUpService = {
      getTasksByDateRange: jest.fn(),
      getOverdueTasks: jest.fn(),
      getTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpTasksService,
        {
          provide: ClickUpService,
          useValue: mockClickUpService,
        },
      ],
    }).compile();

    service = module.get<ClickUpTasksService>(ClickUpTasksService);
  });

  describe('getTasksDueToday', () => {
    const workspaceId = 'workspace-123';

    it('should return today tasks and overdue tasks', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: '1',
          name: 'Task 1',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#aabbcc' },
          due_date: '1704067200000',
          due_date_time: true,
          tags: [{ name: 'work' }],
          custom_fields: [],
          url: 'https://app.clickup.com/t/1',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([
        {
          id: '2',
          name: 'Overdue Task',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#ccbbaa' },
          due_date: '1703980800000',
          due_date_time: false,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/2',
        },
      ]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].name).toBe('Task 1');
      expect(result.overdueTasks).toHaveLength(1);
      expect(result.overdueTasks[0].name).toBe('Overdue Task');
    });

    it('should map task properties correctly', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: 'task-123',
          name: 'Test Task',
          parent: null,
          status: { status: 'in progress', type: 'open', color: '#ff0000' },
          due_date: '1704067200000',
          due_date_time: true,
          tags: [{ name: 'urgent' }, { name: 'work' }],
          custom_fields: [],
          url: 'https://app.clickup.com/t/task-123',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks[0]).toEqual({
        id: 'task-123',
        name: 'Test Task',
        parentName: null,
        status: {
          status: 'in progress',
          type: 'open',
          color: '#ff0000',
        },
        dueDate: expect.any(String),
        hasDueTime: true,
        tags: ['urgent', 'work'],
        timeOfDay: null,
        url: 'https://app.clickup.com/t/task-123',
      });
    });

    it('should handle hasDueTime correctly', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: '1',
          name: 'No time set',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#aaa' },
          due_date: '1704067200000',
          due_date_time: false,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/1',
        },
        {
          id: '2',
          name: 'Time is set',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#bbb' },
          due_date: '1704067200000',
          due_date_time: true,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/2',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks[0].hasDueTime).toBe(false);
      expect(result.tasks[1].hasDueTime).toBe(true);
    });

    it('should extract Time of Day from custom fields', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: '1',
          name: 'Morning Task',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#aaa' },
          due_date: null,
          tags: [],
          custom_fields: [
            {
              name: 'Time of Day',
              value: 1,
              type_config: {
                options: [
                  { orderindex: 0, name: 'Early Morning', color: '#ff0000' },
                  { orderindex: 1, name: 'Morning', color: '#00ff00' },
                  { orderindex: 2, name: 'Mid Day', color: '#0000ff' },
                ],
              },
            },
          ],
          url: 'https://app.clickup.com/t/1',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks[0].timeOfDay).toEqual({
        name: 'Morning',
        color: '#00ff00',
      });
    });

    it('should sort tasks by Time of Day order', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: '1',
          name: 'Evening Task',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#aaa' },
          due_date: null,
          tags: [],
          custom_fields: [
            {
              name: 'time of day',
              value: 0,
              type_config: {
                options: [{ orderindex: 0, name: 'Evening', color: '#aaa' }],
              },
            },
          ],
          url: 'https://app.clickup.com/t/1',
        },
        {
          id: '2',
          name: 'Morning Task',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#bbb' },
          due_date: null,
          tags: [],
          custom_fields: [
            {
              name: 'time of day',
              value: 0,
              type_config: {
                options: [{ orderindex: 0, name: 'Morning', color: '#bbb' }],
              },
            },
          ],
          url: 'https://app.clickup.com/t/2',
        },
        {
          id: '3',
          name: 'No Time Task',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#ccc' },
          due_date: null,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/3',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      // Morning (2) < Evening (4) < No Time (99)
      expect(result.tasks[0].name).toBe('Morning Task');
      expect(result.tasks[1].name).toBe('Evening Task');
      expect(result.tasks[2].name).toBe('No Time Task');
    });

    it('should fetch parent task names for subtasks', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: 'subtask-1',
          name: 'Subtask',
          parent: 'parent-1',
          status: { status: 'to do', type: 'open', color: '#aaa' },
          due_date: null,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/subtask-1',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);
      mockClickUpService.getTask.mockResolvedValue({
        id: 'parent-1',
        name: 'Parent Task',
      });

      const result = await service.getTasksDueToday(workspaceId);

      expect(mockClickUpService.getTask).toHaveBeenCalledWith('parent-1');
      expect(result.tasks[0].parentName).toBe('Parent Task');
    });

    it('should handle parent task fetch failure gracefully', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: 'subtask-1',
          name: 'Subtask',
          parent: 'parent-1',
          status: { status: 'to do', type: 'open', color: '#aaa' },
          due_date: null,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/subtask-1',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);
      mockClickUpService.getTask.mockRejectedValue(new Error('Not found'));

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks[0].parentName).toBeNull();
    });

    it('should deduplicate parent IDs when fetching', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: 'subtask-1',
          name: 'Subtask 1',
          parent: 'parent-1',
          status: { status: 'to do', type: 'open', color: '#aaa' },
          due_date: null,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/subtask-1',
        },
        {
          id: 'subtask-2',
          name: 'Subtask 2',
          parent: 'parent-1',
          status: { status: 'to do', type: 'open', color: '#bbb' },
          due_date: null,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/subtask-2',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);
      mockClickUpService.getTask.mockResolvedValue({
        id: 'parent-1',
        name: 'Parent Task',
      });

      await service.getTasksDueToday(workspaceId);

      // Should only fetch parent once
      expect(mockClickUpService.getTask).toHaveBeenCalledTimes(1);
    });

    it('should return empty arrays when no tasks', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks).toEqual([]);
      expect(result.overdueTasks).toEqual([]);
    });

    it('should handle missing status gracefully', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: '1',
          name: 'Task without status',
          parent: null,
          status: null,
          due_date: null,
          tags: [],
          custom_fields: [],
          url: 'https://app.clickup.com/t/1',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks[0].status).toEqual({
        status: 'unknown',
        type: 'unknown',
        color: '#gray',
      });
    });

    it('should handle missing tags gracefully', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        {
          id: '1',
          name: 'Task without tags',
          parent: null,
          status: { status: 'to do', type: 'open', color: '#aaa' },
          due_date: null,
          tags: null,
          custom_fields: [],
          url: 'https://app.clickup.com/t/1',
        },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.tasks[0].tags).toEqual([]);
    });
  });
});
