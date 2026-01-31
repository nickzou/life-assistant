import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SyncService } from './sync.service';
import { WrikeService } from '../wrike/wrike.service';
import { ClickUpService } from '../clickup/clickup.service';
import { TaskMapping } from '../database/entities/task-mapping.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { WrikeTask } from '../wrike/types/wrike-api.types';

describe('SyncService', () => {
  let service: SyncService;
  let wrikeService: jest.Mocked<Partial<WrikeService>>;
  let clickUpService: jest.Mocked<Partial<ClickUpService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let taskMappingRepository: jest.Mocked<Repository<TaskMapping>>;
  let syncLogRepository: jest.Mocked<Repository<SyncLog>>;

  const mockWrikeTask: Partial<WrikeTask> = {
    id: 'wrike-task-1',
    title: 'Test Task',
    permalink: 'https://wrike.com/task/123',
    customStatusId: 'status-1',
    dates: { type: 'Planned', due: '2024-01-15', start: '2024-01-10' },
  };

  const mockTaskMapping: TaskMapping = {
    id: 'mapping-1',
    wrike_id: 'wrike-task-1',
    clickup_id: 'clickup-task-1',
    integration_type: 'wrike-clickup',
    created_at: new Date(),
    updated_at: new Date(),
    user_id: null,
  };

  beforeEach(async () => {
    wrikeService = {
      getCustomStatuses: jest.fn(),
      updateTask: jest.fn(),
    };

    clickUpService = {
      getCurrentUserId: jest.fn().mockReturnValue('clickup-user-1'),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getList: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('list-123'),
    };

    const mockTaskMappingRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockSyncLogRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: WrikeService, useValue: wrikeService },
        { provide: ClickUpService, useValue: clickUpService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(TaskMapping), useValue: mockTaskMappingRepo },
        { provide: getRepositoryToken(SyncLog), useValue: mockSyncLogRepo },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    taskMappingRepository = module.get(getRepositoryToken(TaskMapping));
    syncLogRepository = module.get(getRepositoryToken(SyncLog));
  });

  describe('syncWrikeToClickUp', () => {
    beforeEach(() => {
      // Mock status loading
      wrikeService.getCustomStatuses.mockResolvedValue({
        kind: 'workflows',
        data: [{
          id: 'workflow-1',
          name: 'Default',
          standard: true,
          hidden: false,
          customStatuses: [{ id: 'status-1', name: 'In Progress', standardName: false, standard: false, color: 'blue', group: 'Active', hidden: false }],
        }],
      });
      clickUpService.getList.mockResolvedValue({
        statuses: [{ status: 'In Progress' }, { status: 'Done' }],
      });
    });

    it('should create new ClickUp task when no mapping exists', async () => {
      taskMappingRepository.findOne.mockResolvedValue(null);
      clickUpService.createTask.mockResolvedValue({ id: 'clickup-task-new' } as any);
      taskMappingRepository.create.mockReturnValue(mockTaskMapping);
      taskMappingRepository.save.mockResolvedValue(mockTaskMapping);

      const result = await service.syncWrikeToClickUp(mockWrikeTask as WrikeTask);

      expect(result).toBe('clickup-task-new');
      expect(clickUpService.createTask).toHaveBeenCalledWith('list-123', expect.objectContaining({
        name: 'Test Task',
        description: 'View in Wrike: https://wrike.com/task/123',
        assignees: ['clickup-user-1'],
      }));
      expect(taskMappingRepository.create).toHaveBeenCalled();
      expect(taskMappingRepository.save).toHaveBeenCalled();
      expect(syncLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create',
        status: 'success',
      }));
    });

    it('should update existing ClickUp task when mapping exists', async () => {
      taskMappingRepository.findOne.mockResolvedValue(mockTaskMapping);

      const result = await service.syncWrikeToClickUp(mockWrikeTask as WrikeTask);

      expect(result).toBe('clickup-task-1');
      expect(clickUpService.updateTask).toHaveBeenCalledWith('clickup-task-1', expect.objectContaining({
        name: 'Test Task',
      }));
      expect(clickUpService.createTask).not.toHaveBeenCalled();
      expect(syncLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        action: 'update',
        status: 'success',
      }));
    });

    it('should log error and throw when sync fails', async () => {
      taskMappingRepository.findOne.mockResolvedValue(null);
      clickUpService.createTask.mockRejectedValue(new Error('API error'));

      await expect(service.syncWrikeToClickUp(mockWrikeTask as WrikeTask)).rejects.toThrow('API error');

      expect(syncLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        error_message: 'API error',
      }));
    });

    it('should throw error when CLICKUP_LIST_ID not configured', async () => {
      configService.get.mockReturnValue(undefined);
      taskMappingRepository.findOne.mockResolvedValue(null);

      await expect(service.syncWrikeToClickUp(mockWrikeTask as WrikeTask)).rejects.toThrow('CLICKUP_LIST_ID not configured');
    });

    it('should convert dates to Unix timestamps', async () => {
      taskMappingRepository.findOne.mockResolvedValue(null);
      clickUpService.createTask.mockResolvedValue({ id: 'clickup-task-new' } as any);
      taskMappingRepository.create.mockReturnValue(mockTaskMapping);

      await service.syncWrikeToClickUp(mockWrikeTask as WrikeTask);

      expect(clickUpService.createTask).toHaveBeenCalledWith('list-123', expect.objectContaining({
        due_date: expect.any(String),
        start_date: expect.any(String),
      }));
    });
  });

  describe('deleteTaskFromClickUp', () => {
    it('should delete ClickUp task and remove mapping', async () => {
      taskMappingRepository.findOne.mockResolvedValue(mockTaskMapping);

      await service.deleteTaskFromClickUp('wrike-task-1');

      expect(clickUpService.deleteTask).toHaveBeenCalledWith('clickup-task-1');
      expect(taskMappingRepository.remove).toHaveBeenCalledWith(mockTaskMapping);
      expect(syncLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        action: 'delete',
        status: 'success',
      }));
    });

    it('should do nothing when no mapping found', async () => {
      taskMappingRepository.findOne.mockResolvedValue(null);

      await service.deleteTaskFromClickUp('wrike-task-1');

      expect(clickUpService.deleteTask).not.toHaveBeenCalled();
      expect(taskMappingRepository.remove).not.toHaveBeenCalled();
    });

    it('should log error when delete fails', async () => {
      taskMappingRepository.findOne.mockResolvedValue(mockTaskMapping);
      clickUpService.deleteTask.mockRejectedValue(new Error('Delete failed'));

      await service.deleteTaskFromClickUp('wrike-task-1');

      expect(syncLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        action: 'delete',
        status: 'failed',
        error_message: 'Delete failed',
      }));
    });
  });

  describe('syncClickUpToWrike', () => {
    const mockClickUpTask = {
      id: 'clickup-task-1',
      name: 'Test Task',
      due_date: '1705276800000',
      start_date: '1704844800000',
      status: { status: 'In Progress' },
    };

    beforeEach(() => {
      wrikeService.getCustomStatuses.mockResolvedValue({
        kind: 'workflows',
        data: [{
          id: 'workflow-1',
          name: 'Default',
          standard: true,
          hidden: false,
          customStatuses: [{ id: 'status-1', name: 'In Progress', standardName: false, standard: false, color: 'blue', group: 'Active', hidden: false }],
        }],
      });
      clickUpService.getList.mockResolvedValue({
        statuses: [{ status: 'In Progress' }, { status: 'Done' }],
      });
    });

    it('should update Wrike task when mapping exists', async () => {
      taskMappingRepository.findOne.mockResolvedValue(mockTaskMapping);

      const result = await service.syncClickUpToWrike(mockClickUpTask);

      expect(result).toBe('wrike-task-1');
      expect(wrikeService.updateTask).toHaveBeenCalledWith('wrike-task-1', expect.objectContaining({
        title: 'Test Task',
      }));
      expect(syncLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        source_platform: 'clickup',
        target_platform: 'wrike',
        action: 'update',
        status: 'success',
      }));
    });

    it('should return undefined when no mapping exists', async () => {
      taskMappingRepository.findOne.mockResolvedValue(null);

      const result = await service.syncClickUpToWrike(mockClickUpTask);

      expect(result).toBeUndefined();
      expect(wrikeService.updateTask).not.toHaveBeenCalled();
    });

    it('should log error and throw when sync fails', async () => {
      taskMappingRepository.findOne.mockResolvedValue(mockTaskMapping);
      wrikeService.updateTask.mockRejectedValue(new Error('Wrike API error'));

      await expect(service.syncClickUpToWrike(mockClickUpTask)).rejects.toThrow('Wrike API error');

      expect(syncLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        error_message: 'Wrike API error',
      }));
    });
  });
});
