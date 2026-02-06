import { Test, TestingModule } from '@nestjs/testing';
import { WrikeTaskSourceService } from './wrike-task-source.service';
import { WrikeService } from '@wrike/wrike.service';
import { WrikeStatusService } from '@wrike/wrike-status.service';
import { WrikeTask } from '@wrike/types/wrike-api.types';

function makeWrikeTask(overrides: Partial<WrikeTask> = {}): WrikeTask {
  return {
    id: 'WRIKE-1',
    accountId: 'ACC-1',
    title: 'Test Wrike Task',
    status: 'Active',
    importance: 'Normal',
    createdDate: '2026-01-01T00:00:00Z',
    updatedDate: '2026-02-01T00:00:00Z',
    dates: { type: 'Planned', due: '2026-02-06T17:00:00' },
    scope: 'WsTask',
    customStatusId: 'STATUS-1',
    permalink: 'https://www.wrike.com/open.htm?id=123',
    priority: 'abc123',
    ...overrides,
  };
}

describe('WrikeTaskSourceService', () => {
  let service: WrikeTaskSourceService;
  let mockWrikeService: any;
  let mockWrikeStatusService: any;

  beforeEach(async () => {
    mockWrikeService = {
      getCurrentUserId: jest.fn().mockReturnValue('USER-1'),
      getTasksByDateRange: jest.fn(),
      getOverdueTasks: jest.fn(),
    };
    mockWrikeStatusService = {
      getStatusInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WrikeTaskSourceService,
        { provide: WrikeService, useValue: mockWrikeService },
        { provide: WrikeStatusService, useValue: mockWrikeStatusService },
      ],
    }).compile();

    service = module.get<WrikeTaskSourceService>(WrikeTaskSourceService);
  });

  it('should have sourceName "wrike"', () => {
    expect(service.sourceName).toBe('wrike');
  });

  describe('getTasksDueToday', () => {
    it('should return empty when user ID is not available', async () => {
      mockWrikeService.getCurrentUserId.mockReturnValue(null);

      const result = await service.getTasksDueToday();

      expect(result.tasks).toHaveLength(0);
      expect(result.overdueTasks).toHaveLength(0);
      expect(mockWrikeService.getTasksByDateRange).not.toHaveBeenCalled();
    });

    it('should map Wrike tasks to UnifiedTaskItem format', async () => {
      const wrikeTask = makeWrikeTask();
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [wrikeTask],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Assigned',
        group: 'Active',
        color: 'Blue1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks).toHaveLength(1);
      const task = result.tasks[0];
      expect(task.id).toBe('WRIKE-1');
      expect(task.name).toBe('Test Wrike Task');
      expect(task.source).toBe('wrike');
      expect(task.readOnly).toBe(true);
      expect(task.tags).toEqual(['work']);
      expect(task.timeOfDay).toBeNull();
      expect(task.parentName).toBeNull();
      expect(task.listId).toBe('');
      expect(task.url).toBe('https://www.wrike.com/open.htm?id=123');
      expect(task.hasDueTime).toBe(false);
    });

    it('should exclude tasks without due dates', async () => {
      const taskNoDue = makeWrikeTask({
        id: 'NO-DUE',
        dates: { type: 'Backlog' },
      });
      const taskWithDue = makeWrikeTask({ id: 'HAS-DUE' });

      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [taskNoDue, taskWithDue],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Assigned',
        group: 'Active',
        color: 'Blue1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('HAS-DUE');
    });

    it('should map Active/Deferred groups to "custom" type', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [makeWrikeTask()],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'In Progress',
        group: 'Active',
        color: 'Blue1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].status.type).toBe('custom');
    });

    it('should map Completed group to "done" type', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [makeWrikeTask()],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Completed',
        group: 'Completed',
        color: 'Green1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].status.type).toBe('done');
    });

    it('should map Cancelled group to "closed" type', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [makeWrikeTask()],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Cancelled',
        group: 'Cancelled',
        color: 'Gray1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].status.type).toBe('closed');
    });

    it('should convert Wrike named colors to hex', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [makeWrikeTask()],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Assigned',
        group: 'Active',
        color: 'Blue1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].status.color).toBe('#2196f3');
    });

    it('should use fallback color for unknown Wrike colors', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [makeWrikeTask()],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Custom',
        group: 'Active',
        color: 'UnknownColor',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].status.color).toBe('#9e9e9e');
    });

    it('should fall back to task.status when status info is null', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [makeWrikeTask({ status: 'Active' })],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue(null);

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].status.status).toBe('Active');
      expect(result.tasks[0].status.type).toBe('custom');
      expect(result.tasks[0].status.color).toBe('#9e9e9e');
    });

    it('should append T00:00:00.000Z to due dates without Z suffix', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [
          makeWrikeTask({
            dates: { type: 'Planned', due: '2026-02-06T17:00:00' },
          }),
        ],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Assigned',
        group: 'Active',
        color: 'Blue1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].dueDate).toBe('2026-02-06T17:00:00T00:00:00.000Z');
    });

    it('should preserve due dates that already end with Z', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [
          makeWrikeTask({
            dates: { type: 'Planned', due: '2026-02-06T00:00:00Z' },
          }),
        ],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({ data: [] });
      mockWrikeStatusService.getStatusInfo.mockResolvedValue({
        name: 'Assigned',
        group: 'Active',
        color: 'Blue1',
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].dueDate).toBe('2026-02-06T00:00:00Z');
    });
  });

  describe('getStatsForToday', () => {
    it('should return zeros when user ID is not available', async () => {
      mockWrikeService.getCurrentUserId.mockReturnValue(null);

      const result = await service.getStatsForToday();

      expect(result).toEqual({
        total: 0,
        completed: 0,
        remaining: 0,
        overdue: 0,
        affirmativeCompletions: 0,
        completionRate: 0,
      });
    });

    it('should compute stats from mapped Wrike tasks', async () => {
      mockWrikeService.getTasksByDateRange.mockResolvedValue({
        data: [
          makeWrikeTask({ id: '1', customStatusId: 'DONE' }),
          makeWrikeTask({ id: '2', customStatusId: 'TODO' }),
          makeWrikeTask({ id: '3', customStatusId: 'COMPLETED' }),
        ],
      });
      mockWrikeService.getOverdueTasks.mockResolvedValue({
        data: [makeWrikeTask({ id: '4' })],
      });

      mockWrikeStatusService.getStatusInfo.mockImplementation(
        async (id: string) => {
          if (id === 'DONE')
            return { name: 'complete', group: 'Completed', color: 'Green1' };
          if (id === 'COMPLETED')
            return { name: 'completed', group: 'Completed', color: 'Green1' };
          return { name: 'Assigned', group: 'Active', color: 'Blue1' };
        },
      );

      const result = await service.getStatsForToday();

      expect(result.total).toBe(3);
      expect(result.completed).toBe(2); // DONE + COMPLETED have type 'done'
      expect(result.remaining).toBe(1);
      expect(result.overdue).toBe(1);
      expect(result.affirmativeCompletions).toBe(2); // 'complete' and 'completed'
    });
  });
});
