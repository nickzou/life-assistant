import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Wrike webhook endpoint
   * POST /webhooks/wrike
   */
  @Post('wrike')
  @HttpCode(200)
  async wrikeWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('Wrike webhook received');
    this.logger.debug('Headers:', JSON.stringify(headers, null, 2));

    try {
      await this.webhooksService.handleWrikeWebhook(body);
      return { success: true };
    } catch (error) {
      this.logger.error('Error processing Wrike webhook:', error.message);
      throw error;
    }
  }

  /**
   * ClickUp webhook endpoint
   * POST /webhooks/clickup
   */
  @Post('clickup')
  @HttpCode(200)
  async clickUpWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('ClickUp webhook received');
    this.logger.debug('Headers:', JSON.stringify(headers, null, 2));

    try {
      await this.webhooksService.handleClickUpWebhook(body);
      return { success: true };
    } catch (error) {
      this.logger.error('Error processing ClickUp webhook:', error.message);
      throw error;
    }
  }
}
