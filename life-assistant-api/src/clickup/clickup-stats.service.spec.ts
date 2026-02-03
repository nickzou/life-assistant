import { Test, TestingModule } from '@nestjs/testing';
import { ClickUpStatsService } from './clickup-stats.service';
import { ClickUpService } from './clickup.service';

describe('ClickUpStatsService', () => {
  let service: ClickUpStatsService;
  let mockClickUpService: any;

  beforeEach(async () => {
    mockClickUpService = {
      getTasksByDateRange: jest.fn(),
      getOverdueTasks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpStatsService,
        {
          provide: ClickUpService,
          useValue: mockClickUpService,
        },
      ],
    }).compile();

    service = module.get<ClickUpStatsService>(ClickUpStatsService);
  });

  describe('getCompletionStatsForDate', () => {
    const workspaceId = 'workspace-123';
    const testDate = new Date(2024, 0, 15); // January 15, 2024

    it('should calculate completion rate correctly', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        { id: '1', status: { status: 'complete' } },
        { id: '2', status: { status: 'Complete' } }, // Test case-insensitivity
        { id: '3', status: { status: 'to do' } },
        { id: '4', status: { status: 'went' } },
      ]);

      const result = await service.getCompletionStatsForDate(
        workspaceId,
        testDate,
      );

      expect(result).toEqual({
        date: '2024-01-15',
        total: 4,
        affirmativeCompletions: 3, // complete, Complete, went
        completionRate: 75,
      });
    });

    it('should exclude "in progress" tasks from total', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        { id: '1', status: { status: 'complete' } },
        { id: '2', status: { status: 'in progress' } },
        { id: '3', status: { status: 'In Progress' } }, // Case-insensitive
        { id: '4', status: { status: 'to do' } },
      ]);

      const result = await service.getCompletionStatsForDate(
        workspaceId,
        testDate,
      );

      expect(result.total).toBe(2); // Only complete and to do
      expect(result.affirmativeCompletions).toBe(1);
      expect(result.completionRate).toBe(50);
    });

    it('should return 0% completion rate when no tasks', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([]);

      const result = await service.getCompletionStatsForDate(
        workspaceId,
        testDate,
      );

      expect(result).toEqual({
        date: '2024-01-15',
        total: 0,
        affirmativeCompletions: 0,
        completionRate: 0,
      });
    });

    it('should recognize all affirmative statuses', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        { id: '1', status: { status: 'complete' } },
        { id: '2', status: { status: 'completed' } },
        { id: '3', status: { status: 'went' } },
        { id: '4', status: { status: 'attended' } },
      ]);

      const result = await service.getCompletionStatsForDate(
        workspaceId,
        testDate,
      );

      expect(result.affirmativeCompletions).toBe(4);
      expect(result.completionRate).toBe(100);
    });
  });

  describe('getCompletionStatsHistory', () => {
    const workspaceId = 'workspace-123';

    it('should return stats for requested number of days', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        { id: '1', status: { status: 'complete' } },
      ]);

      const result = await service.getCompletionStatsHistory(workspaceId, 3);

      expect(result).toHaveLength(3);
      expect(mockClickUpService.getTasksByDateRange).toHaveBeenCalledTimes(3);
    });

    it('should return dates in descending order (today first)', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([]);

      const result = await service.getCompletionStatsHistory(workspaceId, 3);

      // Dates should be in order: today, yesterday, day before
      const dates = result.map((r) => r.date);
      expect(new Date(dates[0]).getTime()).toBeGreaterThan(
        new Date(dates[1]).getTime(),
      );
      expect(new Date(dates[1]).getTime()).toBeGreaterThan(
        new Date(dates[2]).getTime(),
      );
    });
  });

  describe('getTasksDueToday', () => {
    const workspaceId = 'workspace-123';

    it('should calculate today stats correctly', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        { id: '1', status: { status: 'complete', type: 'done' } },
        { id: '2', status: { status: 'to do', type: 'open' } },
        { id: '3', status: { status: 'went', type: 'done' } },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([
        { id: '4', status: { status: 'to do', type: 'open' } },
      ]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.total).toBe(3);
      expect(result.completed).toBe(2); // type: done
      expect(result.remaining).toBe(1);
      expect(result.overdue).toBe(1);
      expect(result.affirmativeCompletions).toBe(2); // complete, went
      expect(result.completionRate).toBe(67); // 2/3 rounded
    });

    it('should exclude "in progress" from total and rate calculation', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([
        { id: '1', status: { status: 'complete', type: 'done' } },
        { id: '2', status: { status: 'in progress', type: 'open' } },
        { id: '3', status: { status: 'to do', type: 'open' } },
      ]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.total).toBe(2); // Excludes "in progress"
      expect(result.affirmativeCompletions).toBe(1);
      expect(result.completionRate).toBe(50);
    });

    it('should return zeros when no tasks', async () => {
      mockClickUpService.getTasksByDateRange.mockResolvedValue([]);
      mockClickUpService.getOverdueTasks.mockResolvedValue([]);

      const result = await service.getTasksDueToday(workspaceId);

      expect(result).toEqual({
        total: 0,
        completed: 0,
        remaining: 0,
        overdue: 0,
        affirmativeCompletions: 0,
        completionRate: 0,
      });
    });
  });
});
