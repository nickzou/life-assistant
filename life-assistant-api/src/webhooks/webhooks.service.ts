import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WrikeService } from '@wrike/wrike.service';
import { ClickUpService } from '@clickup/clickup.service';

export interface WebhookStatusItem {
  id: string;
  source: 'wrike' | 'clickup';
  url: string;
  status: 'active' | 'suspended' | 'unknown';
  events?: string[];
}

export interface WebhookStatusResponse {
  webhooks: WebhookStatusItem[];
  summary: {
    total: number;
    active: number;
    suspended: number;
  };
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly clickUpService: ClickUpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get status of all registered webhooks from both platforms
   */
  async getWebhookStatus(): Promise<WebhookStatusResponse> {
    const webhooks: WebhookStatusItem[] = [];

    // Fetch Wrike webhooks
    try {
      this.logger.log('Fetching Wrike webhooks...');
      const wrikeWebhooks = await this.wrikeService.listWebhooks();

      for (const webhook of wrikeWebhooks.data) {
        webhooks.push({
          id: webhook.id,
          source: 'wrike',
          url: webhook.hookUrl,
          status: webhook.status === 'Active' ? 'active' : 'suspended',
        });
      }
      this.logger.log(`Found ${wrikeWebhooks.data.length} Wrike webhooks`);
    } catch (error) {
      this.logger.error('Failed to fetch Wrike webhooks:', error.message);
    }

    // Fetch ClickUp webhooks
    try {
      const workspaceId = this.configService.get<string>(
        'CLICKUP_WORKSPACE_ID',
      );
      if (workspaceId) {
        this.logger.log('Fetching ClickUp webhooks...');
        const clickUpWebhooks =
          await this.clickUpService.listWebhooks(workspaceId);

        for (const webhook of clickUpWebhooks.webhooks || []) {
          webhooks.push({
            id: webhook.id,
            source: 'clickup',
            url: webhook.endpoint,
            status:
              webhook.health?.status === 'active' ? 'active' : 'suspended',
            events: webhook.events,
          });
        }
        this.logger.log(
          `Found ${clickUpWebhooks.webhooks?.length || 0} ClickUp webhooks`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to fetch ClickUp webhooks:', error.message);
    }

    const summary = {
      total: webhooks.length,
      active: webhooks.filter((w) => w.status === 'active').length,
      suspended: webhooks.filter((w) => w.status === 'suspended').length,
    };

    return { webhooks, summary };
  }

  /**
   * Delete a webhook by source and ID
   */
  async deleteWebhook(source: 'wrike' | 'clickup', id: string): Promise<void> {
    if (source === 'wrike') {
      await this.wrikeService.deleteWebhook(id);
    } else if (source === 'clickup') {
      await this.clickUpService.deleteWebhook(id);
    } else {
      throw new Error(`Unknown webhook source: ${source}`);
    }
  }
}
