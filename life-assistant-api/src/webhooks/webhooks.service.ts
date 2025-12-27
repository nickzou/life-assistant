import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  /**
   * Process incoming Wrike webhook event
   */
  async handleWrikeWebhook(payload: any): Promise<void> {
    this.logger.log('Received Wrike webhook event');
    this.logger.debug('Wrike webhook payload:', JSON.stringify(payload, null, 2));

    // TODO: Implement sync logic
    // For now, just log the event
  }

  /**
   * Process incoming ClickUp webhook event
   */
  async handleClickUpWebhook(payload: any): Promise<void> {
    this.logger.log('Received ClickUp webhook event');
    this.logger.debug('ClickUp webhook payload:', JSON.stringify(payload, null, 2));

    // TODO: Implement sync logic
    // For now, just log the event
  }
}
