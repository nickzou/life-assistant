import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { WrikeService } from '@wrike/wrike.service';
import { ClickUpService } from '@clickup/clickup.service';
import { WrikeWebhooksResponse } from '@wrike/types/wrike-api.types';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let wrikeService: jest.Mocked<Partial<WrikeService>>;
  let clickUpService: jest.Mocked<Partial<ClickUpService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    wrikeService = {
      listWebhooks: jest.fn(),
      deleteWebhook: jest.fn(),
    };

    clickUpService = {
      listWebhooks: jest.fn(),
      deleteWebhook: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: WrikeService, useValue: wrikeService },
        { provide: ClickUpService, useValue: clickUpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
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
