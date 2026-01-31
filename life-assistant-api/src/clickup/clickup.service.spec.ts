import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClickUpService } from './clickup.service';

describe('ClickUpService', () => {
  let service: ClickUpService;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<ClickUpService>(ClickUpService);

    // Access the private axios instance and mock it
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).axiosInstance = mockAxiosInstance;
  });

  describe('getCompletionStatsForDate', () => {
    const workspaceId = 'workspace-123';
    const testDate = new Date(2024, 0, 15); // January 15, 2024

    it('should calculate completion rate correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          tasks: [
            { id: '1', status: { status: 'complete' } },
            { id: '2', status: { status: 'Complete' } }, // Test case-insensitivity
            { id: '3', status: { status: 'to do' } },
            { id: '4', status: { status: 'went' } },
          ],
        },
      });

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
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          tasks: [
            { id: '1', status: { status: 'complete' } },
            { id: '2', status: { status: 'in progress' } },
            { id: '3', status: { status: 'In Progress' } }, // Case-insensitive
            { id: '4', status: { status: 'to do' } },
          ],
        },
      });

      const result = await service.getCompletionStatsForDate(
        workspaceId,
        testDate,
      );

      expect(result.total).toBe(2); // Only complete and to do
      expect(result.affirmativeCompletions).toBe(1);
      expect(result.completionRate).toBe(50);
    });

    it('should return 0% completion rate when no tasks', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { tasks: [] },
      });

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
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          tasks: [
            { id: '1', status: { status: 'complete' } },
            { id: '2', status: { status: 'completed' } },
            { id: '3', status: { status: 'went' } },
            { id: '4', status: { status: 'attended' } },
          ],
        },
      });

      const result = await service.getCompletionStatsForDate(
        workspaceId,
        testDate,
      );

      expect(result.affirmativeCompletions).toBe(4);
      expect(result.completionRate).toBe(100);
    });

    it('should call API with correct date range params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { tasks: [] } });

      await service.getCompletionStatsForDate(workspaceId, testDate);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/team/${workspaceId}/task`,
        {
          params: expect.objectContaining({
            due_date_gt: expect.any(Number),
            due_date_lt: expect.any(Number),
            subtasks: true,
            include_closed: true,
          }),
        },
      );
    });
  });

  describe('getCompletionStatsHistory', () => {
    const workspaceId = 'workspace-123';

    it('should return stats for requested number of days', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          tasks: [{ id: '1', status: { status: 'complete' } }],
        },
      });

      const result = await service.getCompletionStatsHistory(workspaceId, 3);

      expect(result).toHaveLength(3);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should return dates in descending order (today first)', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { tasks: [] },
      });

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
      // First call: today's tasks
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          tasks: [
            { id: '1', status: { status: 'complete', type: 'done' } },
            { id: '2', status: { status: 'to do', type: 'open' } },
            { id: '3', status: { status: 'went', type: 'done' } },
          ],
        },
      });
      // Second call: overdue tasks
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          tasks: [
            { id: '4', status: { status: 'to do', type: 'open' } },
            { id: '5', status: { status: 'done', type: 'done' } }, // Completed, not overdue
          ],
        },
      });

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.total).toBe(3);
      expect(result.completed).toBe(2); // type: done
      expect(result.remaining).toBe(1);
      expect(result.overdue).toBe(1); // Only open tasks count as overdue
      expect(result.affirmativeCompletions).toBe(2); // complete, went
      expect(result.completionRate).toBe(67); // 2/3 rounded
    });

    it('should exclude "in progress" from total and rate calculation', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          tasks: [
            { id: '1', status: { status: 'complete', type: 'done' } },
            { id: '2', status: { status: 'in progress', type: 'open' } },
            { id: '3', status: { status: 'to do', type: 'open' } },
          ],
        },
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { tasks: [] },
      });

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.total).toBe(2); // Excludes "in progress"
      expect(result.affirmativeCompletions).toBe(1);
      expect(result.completionRate).toBe(50);
    });

    it('should return zeros when no tasks', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { tasks: [] },
      });

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

    it('should handle missing tasks array', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {},
      });

      const result = await service.getTasksDueToday(workspaceId);

      expect(result.total).toBe(0);
    });
  });

  describe('getCurrentUserId', () => {
    it('should return null before initialization', () => {
      expect(service.getCurrentUserId()).toBeNull();
    });
  });
});
