import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Headers,
  Param,
  Logger,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Get status of all registered webhooks
   * GET /webhooks/status
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getWebhookStatus() {
    this.logger.log('Fetching webhook status');
    return this.webhooksService.getWebhookStatus();
  }

  /**
   * Delete a webhook
   * DELETE /webhooks/:source/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':source/:id')
  async deleteWebhook(
    @Param('source') source: 'wrike' | 'clickup',
    @Param('id') id: string,
  ) {
    this.logger.log(`Deleting ${source} webhook: ${id}`);
    await this.webhooksService.deleteWebhook(source, id);
    return { success: true };
  }

  /**
   * Wrike webhook endpoint
   * POST /webhooks/wrike
   *
   * IMPORTANT: Always returns 200 to prevent Wrike from suspending the webhook.
   * Errors are logged but not thrown.
   */
  @Post('wrike')
  @HttpCode(200)
  async wrikeWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('Wrike webhook received');
    this.logger.debug('Headers:', JSON.stringify(headers, null, 2));

    // Always return 200 immediately to prevent Wrike from suspending the webhook
    // Process the webhook asynchronously
    this.webhooksService.handleWrikeWebhook(body).catch((error) => {
      this.logger.error('Error processing Wrike webhook:', error.message);
    });

    return { success: true };
  }

  /**
   * ClickUp webhook endpoint
   * POST /webhooks/clickup
   *
   * IMPORTANT: Always returns 200 to prevent ClickUp from suspending the webhook.
   * Errors are logged but not thrown.
   */
  @Post('clickup')
  @HttpCode(200)
  async clickUpWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('ClickUp webhook received');
    this.logger.debug('Headers:', JSON.stringify(headers, null, 2));

    // Always return 200 immediately to prevent ClickUp from suspending the webhook
    // Process the webhook asynchronously
    this.webhooksService.handleClickUpWebhook(body).catch((error) => {
      this.logger.error('Error processing ClickUp webhook:', error.message);
    });

    return { success: true };
  }
}
