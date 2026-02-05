import { Test, TestingModule } from '@nestjs/testing';
import { WrikeWebhookHandlerService } from './wrike-webhook-handler.service';
import { WrikeService } from '@wrike/wrike.service';
import { SyncService } from '@sync/sync.service';
import { WrikeTask } from '@wrike/types/wrike-api.types';

describe('WrikeWebhookHandlerService', () => {
  let service: WrikeWebhookHandlerService;
  let wrikeService: jest.Mocked<Partial<WrikeService>>;
  let syncService: jest.Mocked<Partial<SyncService>>;

  const mockCurrentUserId = 'user-123';

  beforeEach(async () => {
    wrikeService = {
      getCurrentUserId: jest.fn().mockReturnValue(mockCurrentUserId),
      getTask: jest.fn(),
    };

    syncService = {
      syncWrikeToClickUp: jest.fn(),
      deleteTaskFromClickUp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WrikeWebhookHandlerService,
        { provide: WrikeService, useValue: wrikeService },
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    service = module.get<WrikeWebhookHandlerService>(
      WrikeWebhookHandlerService,
    );
  });

  describe('handleWrikeWebhook', () => {
    it('should skip events when current user ID is not initialized', async () => {
      wrikeService.getCurrentUserId.mockReturnValue(null);

      await service.handleWrikeWebhook([
        { eventType: 'TaskStatusChanged', taskId: 'task-1' },
      ]);

      expect(syncService.syncWrikeToClickUp).not.toHaveBeenCalled();
    });

    it('should skip unsupported event types', async () => {
      await service.handleWrikeWebhook([
        { eventType: 'SomeOtherEvent', taskId: 'task-1' },
      ]);

      expect(syncService.syncWrikeToClickUp).not.toHaveBeenCalled();
      expect(wrikeService.getTask).not.toHaveBeenCalled();
    });

    it('should skip TaskResponsiblesAdded when user was not added', async () => {
      await service.handleWrikeWebhook([
        {
          eventType: 'TaskResponsiblesAdded',
          taskId: 'task-1',
          addedResponsibles: ['other-user'],
        },
      ]);

      expect(syncService.syncWrikeToClickUp).not.toHaveBeenCalled();
    });

    it('should sync task when current user is added', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        responsibleIds: [mockCurrentUserId],
      } as WrikeTask;
      wrikeService.getTask.mockResolvedValue({
        kind: 'tasks',
        data: [mockTask],
      });
      syncService.syncWrikeToClickUp.mockResolvedValue('clickup-task-1');

      await service.handleWrikeWebhook([
        {
          eventType: 'TaskResponsiblesAdded',
          taskId: 'task-1',
          addedResponsibles: [mockCurrentUserId],
        },
      ]);

      expect(wrikeService.getTask).toHaveBeenCalledWith('task-1');
      expect(syncService.syncWrikeToClickUp).toHaveBeenCalledWith(mockTask);
    });

    it('should delete task from ClickUp when current user is removed', async () => {
      await service.handleWrikeWebhook([
        {
          eventType: 'TaskResponsiblesRemoved',
          taskId: 'task-1',
          removedResponsibles: [mockCurrentUserId],
        },
      ]);

      expect(syncService.deleteTaskFromClickUp).toHaveBeenCalledWith('task-1');
    });

    it('should skip TaskResponsiblesRemoved when other user was removed', async () => {
      await service.handleWrikeWebhook([
        {
          eventType: 'TaskResponsiblesRemoved',
          taskId: 'task-1',
          removedResponsibles: ['other-user'],
        },
      ]);

      expect(syncService.deleteTaskFromClickUp).not.toHaveBeenCalled();
    });

    it('should delete task from ClickUp on TaskDeleted event', async () => {
      await service.handleWrikeWebhook([
        {
          eventType: 'TaskDeleted',
          taskId: 'task-1',
        },
      ]);

      expect(syncService.deleteTaskFromClickUp).toHaveBeenCalledWith('task-1');
    });

    it('should sync task on status change if assigned to current user', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        responsibleIds: [mockCurrentUserId],
      } as WrikeTask;
      wrikeService.getTask.mockResolvedValue({
        kind: 'tasks',
        data: [mockTask],
      });
      syncService.syncWrikeToClickUp.mockResolvedValue('clickup-task-1');

      await service.handleWrikeWebhook([
        {
          eventType: 'TaskStatusChanged',
          taskId: 'task-1',
        },
      ]);

      expect(syncService.syncWrikeToClickUp).toHaveBeenCalledWith(mockTask);
    });

    it('should skip status change if task not assigned to current user', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        responsibleIds: ['other-user'],
      } as WrikeTask;
      wrikeService.getTask.mockResolvedValue({
        kind: 'tasks',
        data: [mockTask],
      });

      await service.handleWrikeWebhook([
        {
          eventType: 'TaskStatusChanged',
          taskId: 'task-1',
        },
      ]);

      expect(syncService.syncWrikeToClickUp).not.toHaveBeenCalled();
    });

    it('should handle array of events', async () => {
      await service.handleWrikeWebhook([
        { eventType: 'TaskDeleted', taskId: 'task-1' },
        { eventType: 'TaskDeleted', taskId: 'task-2' },
      ]);

      expect(syncService.deleteTaskFromClickUp).toHaveBeenCalledTimes(2);
      expect(syncService.deleteTaskFromClickUp).toHaveBeenCalledWith('task-1');
      expect(syncService.deleteTaskFromClickUp).toHaveBeenCalledWith('task-2');
    });

    it('should handle non-array payload', async () => {
      await service.handleWrikeWebhook({
        eventType: 'TaskDeleted',
        taskId: 'task-1',
      });

      expect(syncService.deleteTaskFromClickUp).toHaveBeenCalledWith('task-1');
    });
  });
});
