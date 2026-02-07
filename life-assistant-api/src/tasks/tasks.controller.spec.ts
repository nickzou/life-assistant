import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskAnnotationService } from './task-annotation.service';

describe('TasksController', () => {
  let controller: TasksController;
  let mockTasksService: jest.Mocked<
    Pick<TasksService, 'getStatsForToday' | 'getTasksDueToday'>
  >;
  let mockAnnotationService: jest.Mocked<
    Pick<TaskAnnotationService, 'setTimeOfDay'>
  >;

  beforeEach(async () => {
    mockTasksService = {
      getStatsForToday: jest.fn(),
      getTasksDueToday: jest.fn(),
    };
    mockAnnotationService = {
      setTimeOfDay: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: TaskAnnotationService, useValue: mockAnnotationService },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  describe('getStatsToday', () => {
    it('should delegate to tasksService.getStatsForToday', async () => {
      const stats = {
        total: 5,
        completed: 2,
        remaining: 3,
        overdue: 1,
        affirmativeCompletions: 2,
        completionRate: 40,
      };
      mockTasksService.getStatsForToday.mockResolvedValue(stats);

      const result = await controller.getStatsToday();

      expect(result).toEqual(stats);
      expect(mockTasksService.getStatsForToday).toHaveBeenCalled();
    });
  });

  describe('getTasksToday', () => {
    it('should delegate to tasksService.getTasksDueToday', async () => {
      const tasks = { tasks: [], overdueTasks: [] };
      mockTasksService.getTasksDueToday.mockResolvedValue(tasks);

      const result = await controller.getTasksToday();

      expect(result).toEqual(tasks);
      expect(mockTasksService.getTasksDueToday).toHaveBeenCalled();
    });
  });

  describe('setTimeOfDay', () => {
    it('should call annotationService.setTimeOfDay and return success', async () => {
      mockAnnotationService.setTimeOfDay.mockResolvedValue(undefined);

      const result = await controller.setTimeOfDay('wrike', 'task-1', {
        timeOfDay: 'morning',
      });

      expect(mockAnnotationService.setTimeOfDay).toHaveBeenCalledWith(
        'task-1',
        'wrike',
        'morning',
      );
      expect(result).toEqual({ success: true });
    });

    it('should pass null timeOfDay to clear annotation', async () => {
      mockAnnotationService.setTimeOfDay.mockResolvedValue(undefined);

      const result = await controller.setTimeOfDay('wrike', 'task-1', {
        timeOfDay: null,
      });

      expect(mockAnnotationService.setTimeOfDay).toHaveBeenCalledWith(
        'task-1',
        'wrike',
        null,
      );
      expect(result).toEqual({ success: true });
    });

    it('should pass through the source parameter correctly', async () => {
      mockAnnotationService.setTimeOfDay.mockResolvedValue(undefined);

      await controller.setTimeOfDay('openproject', 'task-42', {
        timeOfDay: 'evening',
      });

      expect(mockAnnotationService.setTimeOfDay).toHaveBeenCalledWith(
        'task-42',
        'openproject',
        'evening',
      );
    });
  });
});
