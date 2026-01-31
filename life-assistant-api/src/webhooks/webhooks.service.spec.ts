import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { WrikeService } from '../wrike/wrike.service';
import { ClickUpService } from '../clickup/clickup.service';
import { SyncService } from '../sync/sync.service';
import { TaskInsightsService } from '../task-insights/task-insights.service';
import {
  WrikeTask,
  WrikeWebhooksResponse,
} from '../wrike/types/wrike-api.types';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let wrikeService: jest.Mocked<Partial<WrikeService>>;
  let clickUpService: jest.Mocked<Partial<ClickUpService>>;
  let syncService: jest.Mocked<Partial<SyncService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let taskInsightsService: jest.Mocked<Partial<TaskInsightsService>>;

  const mockCurrentUserId = 'user-123';

  beforeEach(async () => {
    wrikeService = {
      getCurrentUserId: jest.fn().mockReturnValue(mockCurrentUserId),
      getTask: jest.fn(),
      listWebhooks: jest.fn(),
      deleteWebhook: jest.fn(),
    };

    clickUpService = {
      listWebhooks: jest.fn(),
      deleteWebhook: jest.fn(),
    };

    syncService = {
      syncWrikeToClickUp: jest.fn(),
      deleteTaskFromClickUp: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    taskInsightsService = {
      trackDueDateChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: WrikeService, useValue: wrikeService },
        { provide: ClickUpService, useValue: clickUpService },
        { provide: SyncService, useValue: syncService },
        { provide: ConfigService, useValue: configService },
        { provide: TaskInsightsService, useValue: taskInsightsService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
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

  describe('handleClickUpWebhook', () => {
    it('should log event but take no action (reverse sync disabled)', async () => {
      await service.handleClickUpWebhook({
        event: 'taskUpdated',
        task_id: 'task-1',
      });

      // Just verify it doesn't throw - reverse sync is disabled
      expect(syncService.syncWrikeToClickUp).not.toHaveBeenCalled();
    });
  });

  describe('getWebhookStatus', () => {
    it('should aggregate webhooks from both platforms', async () => {
      wrikeService.listWebhooks.mockResolvedValue({
        kind: 'webhooks',
        data: [
          {
            id: 'wrike-1',
            accountId: 'acc-1',
            hookUrl: 'https://example.com/wrike',
            status: 'Active',
          },
          {
            id: 'wrike-2',
            accountId: 'acc-1',
            hookUrl: 'https://example.com/wrike2',
            status: 'Suspended',
          },
        ],
      } as WrikeWebhooksResponse);

      configService.get.mockReturnValue('workspace-123');
      clickUpService.listWebhooks.mockResolvedValue({
        webhooks: [
          {
            id: 'clickup-1',
            endpoint: 'https://example.com/clickup',
            health: { status: 'active' },
            events: ['taskUpdated'],
          },
        ],
      });

      const result = await service.getWebhookStatus();

      expect(result.webhooks).toHaveLength(3);
      expect(result.summary).toEqual({
        total: 3,
        active: 2,
        suspended: 1,
      });
    });

    it('should handle Wrike API errors gracefully', async () => {
      wrikeService.listWebhooks.mockRejectedValue(new Error('API error'));
      configService.get.mockReturnValue('workspace-123');
      clickUpService.listWebhooks.mockResolvedValue({ webhooks: [] });

      const result = await service.getWebhookStatus();

      expect(result.webhooks).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('should handle ClickUp API errors gracefully', async () => {
      wrikeService.listWebhooks.mockResolvedValue({
        kind: 'webhooks',
        data: [],
      } as WrikeWebhooksResponse);
      configService.get.mockReturnValue('workspace-123');
      clickUpService.listWebhooks.mockRejectedValue(new Error('API error'));

      const result = await service.getWebhookStatus();

      expect(result.webhooks).toHaveLength(0);
    });

    it('should skip ClickUp when workspace ID not configured', async () => {
      wrikeService.listWebhooks.mockResolvedValue({
        kind: 'webhooks',
        data: [],
      } as WrikeWebhooksResponse);
      configService.get.mockReturnValue(undefined);

      await service.getWebhookStatus();

      expect(clickUpService.listWebhooks).not.toHaveBeenCalled();
    });
  });

  describe('deleteWebhook', () => {
    it('should delete Wrike webhook', async () => {
      await service.deleteWebhook('wrike', 'webhook-123');

      expect(wrikeService.deleteWebhook).toHaveBeenCalledWith('webhook-123');
    });

    it('should delete ClickUp webhook', async () => {
      await service.deleteWebhook('clickup', 'webhook-123');

      expect(clickUpService.deleteWebhook).toHaveBeenCalledWith('webhook-123');
    });

    it('should throw error for unknown source', async () => {
      await expect(
        service.deleteWebhook('unknown' as any, 'webhook-123'),
      ).rejects.toThrow('Unknown webhook source: unknown');
    });
  });
});
