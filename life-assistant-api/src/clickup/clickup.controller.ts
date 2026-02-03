import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Logger,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickUpService } from './clickup.service';
import { ClickUpStatsService } from './clickup-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clickup')
export class ClickUpController {
  private readonly logger = new Logger(ClickUpController.name);

  constructor(
    private readonly clickUpService: ClickUpService,
    private readonly clickUpStatsService: ClickUpStatsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get tasks due today summary
   * GET /clickup/tasks/today
   */
  @UseGuards(JwtAuthGuard)
  @Get('tasks/today')
  async getTasksDueToday() {
    const workspaceId = this.configService.get<string>('CLICKUP_WORKSPACE_ID');
    if (!workspaceId) {
      throw new Error('CLICKUP_WORKSPACE_ID not configured');
    }
    return this.clickUpStatsService.getTasksDueToday(workspaceId);
  }

  /**
   * Get completion stats history for last N days
   * GET /clickup/tasks/stats/:days
   */
  @UseGuards(JwtAuthGuard)
  @Get('tasks/stats/:days')
  async getCompletionStatsHistory(@Param('days') days: string) {
    const workspaceId = this.configService.get<string>('CLICKUP_WORKSPACE_ID');
    if (!workspaceId) {
      throw new Error('CLICKUP_WORKSPACE_ID not configured');
    }
    return this.clickUpStatsService.getCompletionStatsHistory(
      workspaceId,
      parseInt(days, 10),
    );
  }

  /**
   * Test endpoint: Fetch tasks from configured list
   * GET /clickup/test/tasks
   */
  @Get('test/tasks')
  async testTasks() {
    try {
      const listId = this.configService.get<string>('CLICKUP_LIST_ID');
      if (!listId) {
        throw new Error('CLICKUP_LIST_ID not configured in .env');
      }

      const tasks = await this.clickUpService.getTasksInList(listId);
      this.logger.log(`Fetched ${tasks.tasks?.length || 0} tasks from list`);
      return {
        success: true,
        listId,
        taskCount: tasks.tasks?.length || 0,
        data: tasks,
      };
    } catch (error) {
      this.logger.error('Failed to fetch tasks:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test endpoint: Fetch a specific task by ID
   * GET /clickup/test/task/:taskId
   */
  @Get('test/task/:taskId')
  async testTask(@Param('taskId') taskId: string) {
    try {
      const task = await this.clickUpService.getTask(taskId);
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
   * Test endpoint: List all spaces in workspace
   * GET /clickup/test/spaces
   */
  @Get('test/spaces')
  async testSpaces() {
    try {
      const workspaceId = this.configService.get<string>(
        'CLICKUP_WORKSPACE_ID',
      );
      if (!workspaceId) {
        throw new Error('CLICKUP_WORKSPACE_ID not configured in .env');
      }

      const spaces = await this.clickUpService.getSpaces(workspaceId);
      this.logger.log(`Fetched ${spaces.spaces?.length || 0} spaces`);
      return {
        success: true,
        count: spaces.spaces?.length || 0,
        data: spaces,
      };
    } catch (error) {
      this.logger.error('Failed to fetch spaces:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test endpoint: Get a specific list with statuses
   * GET /clickup/test/list/:listId
   */
  @Get('test/list/:listId')
  async testList(@Param('listId') listId: string) {
    try {
      const list = await this.clickUpService.getList(listId);
      this.logger.log(`Fetched list: ${list.name}`);
      return {
        success: true,
        data: list,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch list ${listId}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test endpoint: List all lists in a space
   * GET /clickup/test/lists/:spaceId
   */
  @Get('test/lists/:spaceId')
  async testLists(@Param('spaceId') spaceId: string) {
    try {
      const lists = await this.clickUpService.getListsInSpace(spaceId);
      this.logger.log(`Fetched ${lists.lists?.length || 0} lists from space`);
      return {
        success: true,
        count: lists.lists?.length || 0,
        data: lists,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch lists from space ${spaceId}:`,
        error.message,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test endpoint: Create a test task in the configured list
   * POST /clickup/test/create-task
   */
  @Post('test/create-task')
  async createTestTask(@Body() body: { name: string; description?: string }) {
    try {
      const listId = this.configService.get<string>('CLICKUP_LIST_ID');
      if (!listId) {
        throw new Error('CLICKUP_LIST_ID not configured in .env');
      }

      const task = await this.clickUpService.createTask(listId, {
        name: body.name || 'Test Task',
        description: body.description || 'Created via API test endpoint',
      });
      this.logger.log(`Created task: ${task.id}`);
      return {
        success: true,
        data: task,
      };
    } catch (error) {
      this.logger.error('Failed to create task:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all registered webhooks
   * GET /clickup/webhooks/:teamId
   */
  @Get('webhooks/:teamId')
  async listWebhooks(@Param('teamId') teamId: string) {
    try {
      const webhooks = await this.clickUpService.listWebhooks(teamId);
      this.logger.log(`Found ${webhooks.webhooks?.length || 0} webhooks`);
      return {
        success: true,
        count: webhooks.webhooks?.length || 0,
        webhooks: webhooks.webhooks,
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
   * Setup webhook for current environment (uses configured workspace ID)
   * POST /clickup/webhooks/setup
   * Body: { "baseUrl": "https://your-server.com" }
   */
  @UseGuards(JwtAuthGuard)
  @Post('webhooks/setup')
  async setupWebhookAuto(@Body() body: { baseUrl: string }) {
    try {
      const teamId = this.configService.get<string>('CLICKUP_WORKSPACE_ID');
      if (!teamId) {
        return {
          success: false,
          error: 'CLICKUP_WORKSPACE_ID not configured',
        };
      }

      if (!body.baseUrl) {
        return {
          success: false,
          error: 'baseUrl is required',
        };
      }

      const hookUrl = `${body.baseUrl}/webhooks/clickup`;

      this.logger.log(`Setting up webhook for team ${teamId}: ${hookUrl}`);

      const webhook = await this.clickUpService.createWebhook(teamId, hookUrl);

      return {
        success: true,
        message: 'Webhook registered successfully',
        webhook,
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
   * Setup webhook for current environment
   * POST /clickup/webhooks/:teamId/setup
   * Body: { "baseUrl": "https://your-server.com" } (optional)
   */
  @Post('webhooks/:teamId/setup')
  async setupWebhook(
    @Param('teamId') teamId: string,
    @Body() body: { baseUrl?: string },
  ) {
    try {
      const baseUrl = body.baseUrl || 'https://e2ab384a1a9f.ngrok.app';
      const hookUrl = `${baseUrl}/webhooks/clickup`;

      this.logger.log(`Setting up webhook for team ${teamId}: ${hookUrl}`);

      const webhook = await this.clickUpService.createWebhook(teamId, hookUrl);

      return {
        success: true,
        message: 'Webhook registered successfully',
        webhook,
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
   * Delete a webhook by ID
   * DELETE /clickup/webhooks/:webhookId
   */
  @Delete('webhooks/:webhookId')
  async deleteWebhook(@Param('webhookId') webhookId: string) {
    try {
      await this.clickUpService.deleteWebhook(webhookId);
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
