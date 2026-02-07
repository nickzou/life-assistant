import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAnnotationService } from './task-annotation.service';
import { TaskAnnotation } from '../database/entities/task-annotation.entity';

describe('TaskAnnotationService', () => {
  let service: TaskAnnotationService;
  let repository: jest.Mocked<
    Pick<Repository<TaskAnnotation>, 'find' | 'findOne' | 'save' | 'create'>
  >;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAnnotationService,
        {
          provide: getRepositoryToken(TaskAnnotation),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<TaskAnnotationService>(TaskAnnotationService);
  });

  describe('getTimeOfDayAnnotations', () => {
    it('should return empty map for empty taskIds', async () => {
      const result = await service.getTimeOfDayAnnotations([], 'wrike');

      expect(result.size).toBe(0);
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should return annotations mapped by task ID', async () => {
      repository.find.mockResolvedValue([
        {
          id: 'ann-1',
          task_id: 'task-1',
          source: 'wrike',
          time_of_day: 'morning',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'ann-2',
          task_id: 'task-2',
          source: 'wrike',
          time_of_day: 'evening',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.getTimeOfDayAnnotations(
        ['task-1', 'task-2'],
        'wrike',
      );

      expect(result.size).toBe(2);
      expect(result.get('task-1')).toEqual({
        name: 'morning',
        color: '#F59E0B',
      });
      expect(result.get('task-2')).toEqual({
        name: 'evening',
        color: '#8B5CF6',
      });
    });

    it('should skip annotations with null time_of_day', async () => {
      repository.find.mockResolvedValue([
        {
          id: 'ann-1',
          task_id: 'task-1',
          source: 'wrike',
          time_of_day: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.getTimeOfDayAnnotations(
        ['task-1'],
        'wrike',
      );

      expect(result.size).toBe(0);
    });

    it('should skip annotations with unrecognized time_of_day values', async () => {
      repository.find.mockResolvedValue([
        {
          id: 'ann-1',
          task_id: 'task-1',
          source: 'wrike',
          time_of_day: 'midnight',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.getTimeOfDayAnnotations(
        ['task-1'],
        'wrike',
      );

      expect(result.size).toBe(0);
    });

    it('should query with correct source filter', async () => {
      repository.find.mockResolvedValue([]);

      await service.getTimeOfDayAnnotations(['task-1'], 'openproject');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          task_id: expect.anything(),
          source: 'openproject',
        },
      });
    });
  });

  describe('setTimeOfDay', () => {
    it('should update existing annotation', async () => {
      const existing = {
        id: 'ann-1',
        task_id: 'task-1',
        source: 'wrike',
        time_of_day: 'morning',
        created_at: new Date(),
        updated_at: new Date(),
      };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(existing);

      await service.setTimeOfDay('task-1', 'wrike', 'evening');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ time_of_day: 'evening' }),
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create new annotation when none exists', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = {
        task_id: 'task-1',
        source: 'wrike',
        time_of_day: 'morning',
      };
      repository.create.mockReturnValue(created as TaskAnnotation);
      repository.save.mockResolvedValue(created as TaskAnnotation);

      await service.setTimeOfDay('task-1', 'wrike', 'morning');

      expect(repository.create).toHaveBeenCalledWith({
        task_id: 'task-1',
        source: 'wrike',
        time_of_day: 'morning',
      });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('should clear time_of_day by setting to null on existing', async () => {
      const existing = {
        id: 'ann-1',
        task_id: 'task-1',
        source: 'wrike',
        time_of_day: 'morning',
        created_at: new Date(),
        updated_at: new Date(),
      };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(existing);

      await service.setTimeOfDay('task-1', 'wrike', null);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ time_of_day: null }),
      );
    });

    it('should create with null time_of_day when no existing annotation', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = {
        task_id: 'task-1',
        source: 'wrike',
        time_of_day: null,
      };
      repository.create.mockReturnValue(created as TaskAnnotation);
      repository.save.mockResolvedValue(created as TaskAnnotation);

      await service.setTimeOfDay('task-1', 'wrike', null);

      expect(repository.create).toHaveBeenCalledWith({
        task_id: 'task-1',
        source: 'wrike',
        time_of_day: null,
      });
    });

    it('should look up by task_id and source', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({} as TaskAnnotation);
      repository.save.mockResolvedValue({} as TaskAnnotation);

      await service.setTimeOfDay('task-42', 'openproject', 'mid day');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { task_id: 'task-42', source: 'openproject' },
      });
    });
  });
});
