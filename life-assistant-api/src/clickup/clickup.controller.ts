import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickUpService } from './clickup.service';

@Controller('clickup')
export class ClickUpController {
  private readonly logger = new Logger(ClickUpController.name);

  constructor(
    private readonly clickUpService: ClickUpService,
    private readonly configService: ConfigService,
  ) {}

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
      const workspaceId = this.configService.get<string>('CLICKUP_WORKSPACE_ID');
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
      this.logger.error(`Failed to fetch lists from space ${spaceId}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
