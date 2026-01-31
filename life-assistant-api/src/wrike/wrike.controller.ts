import {
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Delete,
  Body,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WrikeService } from './wrike.service';

@Controller('wrike')
export class WrikeController {
  private readonly logger = new Logger(WrikeController.name);

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Test endpoint: Fetch custom statuses/workflows
   * GET /wrike/test/statuses
   */
  @Get('test/statuses')
  async testStatuses() {
    try {
      const statuses = await this.wrikeService.getCustomStatuses();
      this.logger.log('Custom statuses fetched successfully');
      return {
        success: true,
        data: statuses,
      };
    } catch (error) {
      this.logger.error('Failed to fetch statuses:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test endpoint: Fetch a specific task by ID
   * GET /wrike/test/task/:taskId
   */
  @Get('test/task/:taskId')
  async testTask(@Param('taskId') taskId: string) {
    try {
      const task = await this.wrikeService.getTask(taskId);
      this.logger.log(`Fetched task: ${taskId}`);
      return {
        success: true,
        data: task,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch task ${taskId}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test endpoint: Get current authenticated user
   * GET /wrike/test/me
   */
  @Get('test/me')
  async testCurrentUser() {
    try {
      const user = await this.wrikeService.getCurrentUser();
      this.logger.log(`Fetched current user: ${user.data?.[0]?.id}`);
      return {
        success: true,
        userId: user.data?.[0]?.id,
        data: user,
      };
    } catch (error) {
      this.logger.error('Failed to fetch current user:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Setup webhook for current environment
   * POST /wrike/webhooks/setup
   * Body: { "baseUrl": "https://your-server.com" } (optional, auto-detects from ngrok)
   */
  @Post('webhooks/setup')
  async setupWebhook(@Body() body: { baseUrl?: string }) {
    try {
      // Use provided baseUrl or construct from ngrok
      const baseUrl = body.baseUrl || 'https://e2ab384a1a9f.ngrok.app';
      const hookUrl = `${baseUrl}/webhooks/wrike`;

      this.logger.log(`Setting up webhook for: ${hookUrl}`);

      const webhook = await this.wrikeService.createWebhook(hookUrl);

      return {
        success: true,
        message: 'Webhook registered successfully',
        webhook: webhook.data[0],
        hookUrl,
      };
    } catch (error) {
      this.logger.error('Failed to setup webhook:', error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }

  /**
   * List all registered webhooks
   * GET /wrike/webhooks
   */
  @Get('webhooks')
  async listWebhooks() {
    try {
      const webhooks = await this.wrikeService.listWebhooks();
      this.logger.log(`Found ${webhooks.data?.length || 0} webhooks`);
      return {
        success: true,
        count: webhooks.data?.length || 0,
        webhooks: webhooks.data,
      };
    } catch (error) {
      this.logger.error('Failed to list webhooks:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a webhook by ID
   * DELETE /wrike/webhooks/:webhookId
   */
  @Delete('webhooks/:webhookId')
  async deleteWebhook(@Param('webhookId') webhookId: string) {
    try {
      await this.wrikeService.deleteWebhook(webhookId);
      this.logger.log(`Deleted webhook: ${webhookId}`);
      return {
        success: true,
        message: `Webhook ${webhookId} deleted successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete webhook ${webhookId}:`,
        error.message,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
