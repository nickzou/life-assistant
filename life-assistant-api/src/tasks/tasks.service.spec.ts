import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TaskAnnotationService } from './task-annotation.service';
import {
  TASK_SOURCE,
  TaskSource,
  UnifiedTaskItem,
} from './interfaces/task-source.interface';

function makeTask(overrides: Partial<UnifiedTaskItem> = {}): UnifiedTaskItem {
  return {
    id: 'task-1',
    name: 'Test Task',
    parentName: null,
    listId: '',
    status: { status: 'to do', type: 'open', color: '#87909e' },
    startDate: null,
    hasStartTime: false,
    dueDate: '2026-02-06T09:00:00.000Z',
    hasDueTime: false,
    tags: [],
    timeOfDay: null,
    url: 'https://example.com',
    source: 'clickup',
    readOnly: false,
    ...overrides,
  };
}

describe('TasksService', () => {
  let service: TasksService;
  let mockClickUpSource: jest.Mocked<TaskSource>;
  let mockWrikeSource: jest.Mocked<TaskSource>;

  beforeEach(async () => {
    mockClickUpSource = {
      sourceName: 'clickup',
      getTasksDueToday: jest.fn(),
      getStatsForToday: jest.fn(),
    };
    mockWrikeSource = {
      sourceName: 'wrike',
      getTasksDueToday: jest.fn(),
      getStatsForToday: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TASK_SOURCE,
          useValue: [mockClickUpSource, mockWrikeSource],
        },
        {
          provide: TaskAnnotationService,
          useValue: {
            getTimeOfDayAnnotations: jest.fn().mockResolvedValue(new Map()),
            setTimeOfDay: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('getTasksDueToday', () => {
    it('should aggregate tasks from all sources', async () => {
      const clickUpTask = makeTask({ id: 'cu-1', source: 'clickup' });
      const wrikeTask = makeTask({
        id: 'wr-1',
        source: 'wrike',
        readOnly: true,
      });

      mockClickUpSource.getTasksDueToday.mockResolvedValue({
        tasks: [clickUpTask],
        overdueTasks: [],
      });
      mockWrikeSource.getTasksDueToday.mockResolvedValue({
        tasks: [wrikeTask],
        overdueTasks: [],
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks.map((t) => t.id)).toContain('cu-1');
      expect(result.tasks.map((t) => t.id)).toContain('wr-1');
    });

    it('should aggregate overdue tasks from all sources', async () => {
      const clickUpOverdue = makeTask({ id: 'cu-overdue', source: 'clickup' });
      const wrikeOverdue = makeTask({ id: 'wr-overdue', source: 'wrike' });

      mockClickUpSource.getTasksDueToday.mockResolvedValue({
        tasks: [],
        overdueTasks: [clickUpOverdue],
      });
      mockWrikeSource.getTasksDueToday.mockResolvedValue({
        tasks: [],
        overdueTasks: [wrikeOverdue],
      });

      const result = await service.getTasksDueToday();

      expect(result.overdueTasks).toHaveLength(2);
    });

    it('should still return tasks when one source fails', async () => {
      const clickUpTask = makeTask({ id: 'cu-1', source: 'clickup' });

      mockClickUpSource.getTasksDueToday.mockResolvedValue({
        tasks: [clickUpTask],
        overdueTasks: [],
      });
      mockWrikeSource.getTasksDueToday.mockRejectedValue(
        new Error('Wrike API down'),
      );

      const result = await service.getTasksDueToday();

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('cu-1');
    });

    it('should return empty arrays when all sources fail', async () => {
      mockClickUpSource.getTasksDueToday.mockRejectedValue(
        new Error('ClickUp down'),
      );
      mockWrikeSource.getTasksDueToday.mockRejectedValue(
        new Error('Wrike down'),
      );

      const result = await service.getTasksDueToday();

      expect(result.tasks).toHaveLength(0);
      expect(result.overdueTasks).toHaveLength(0);
    });

    it('should sort tasks by time of day', async () => {
      const eveningTask = makeTask({
        id: 'evening',
        timeOfDay: { name: 'Evening', color: '#9b59b6' },
      });
      const morningTask = makeTask({
        id: 'morning',
        timeOfDay: { name: 'Morning', color: '#FF4081' },
      });

      mockClickUpSource.getTasksDueToday.mockResolvedValue({
        tasks: [eveningTask, morningTask],
        overdueTasks: [],
      });
      mockWrikeSource.getTasksDueToday.mockResolvedValue({
        tasks: [],
        overdueTasks: [],
      });

      const result = await service.getTasksDueToday();

      expect(result.tasks[0].id).toBe('morning');
      expect(result.tasks[1].id).toBe('evening');
    });
  });

  describe('getStatsForToday', () => {
    it('should aggregate stats from all sources', async () => {
      mockClickUpSource.getStatsForToday.mockResolvedValue({
        total: 10,
        completed: 5,
        remaining: 5,
        overdue: 2,
        affirmativeCompletions: 4,
        completionRate: 40,
      });
      mockWrikeSource.getStatsForToday.mockResolvedValue({
        total: 3,
        completed: 1,
        remaining: 2,
        overdue: 1,
        affirmativeCompletions: 1,
        completionRate: 33,
      });

      const result = await service.getStatsForToday();

      expect(result.total).toBe(13);
      expect(result.completed).toBe(6);
      expect(result.remaining).toBe(7);
      expect(result.overdue).toBe(3);
      expect(result.affirmativeCompletions).toBe(5);
      expect(result.completionRate).toBe(38); // 5/13 = 38%
    });

    it('should still return stats when one source fails', async () => {
      mockClickUpSource.getStatsForToday.mockResolvedValue({
        total: 10,
        completed: 5,
        remaining: 5,
        overdue: 2,
        affirmativeCompletions: 4,
        completionRate: 40,
      });
      mockWrikeSource.getStatsForToday.mockRejectedValue(
        new Error('Wrike API down'),
      );

      const result = await service.getStatsForToday();

      expect(result.total).toBe(10);
      expect(result.completed).toBe(5);
      expect(result.completionRate).toBe(40);
    });

    it('should return zeros when all sources fail', async () => {
      mockClickUpSource.getStatsForToday.mockRejectedValue(
        new Error('ClickUp down'),
      );
      mockWrikeSource.getStatsForToday.mockRejectedValue(
        new Error('Wrike down'),
      );

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

    it('should recalculate completion rate from aggregated totals', async () => {
      // Source 1: 50% (1/2), Source 2: 100% (2/2)
      // Combined should be 75% (3/4), not average of 50% and 100%
      mockClickUpSource.getStatsForToday.mockResolvedValue({
        total: 2,
        completed: 1,
        remaining: 1,
        overdue: 0,
        affirmativeCompletions: 1,
        completionRate: 50,
      });
      mockWrikeSource.getStatsForToday.mockResolvedValue({
        total: 2,
        completed: 2,
        remaining: 0,
        overdue: 0,
        affirmativeCompletions: 2,
        completionRate: 100,
      });

      const result = await service.getStatsForToday();

      expect(result.completionRate).toBe(75); // 3/4, not (50+100)/2
    });
  });
});
