import { Controller, Post, Get, Delete, Body, Headers, Param, Logger, HttpCode, UseGuards } from '@nestjs/common';
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
