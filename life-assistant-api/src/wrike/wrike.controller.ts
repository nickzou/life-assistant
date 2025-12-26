import { Controller, Get, Logger, Param } from '@nestjs/common';
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
   * Test endpoint: Fetch tasks from configured folder
   * GET /wrike/test/tasks
   */
  @Get('test/tasks')
  async testTasks() {
    try {
      const folderId = this.configService.get<string>('WRIKE_FOLDER_ID');
      if (!folderId) {
        throw new Error('WRIKE_FOLDER_ID not configured in .env');
      }

      const tasks = await this.wrikeService.getTasksInFolder(folderId);
      this.logger.log(`Fetched ${tasks.data?.length || 0} tasks from folder`);
      return {
        success: true,
        folderId,
        taskCount: tasks.data?.length || 0,
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
   * Test endpoint: List all folders
   * GET /wrike/test/folders
   */
  @Get('test/folders')
  async testFolders() {
    try {
      const folders = await this.wrikeService.getAllFolders();
      this.logger.log(`Fetched ${folders.data?.length || 0} folders`);
      return {
        success: true,
        count: folders.data?.length || 0,
        data: folders,
      };
    } catch (error) {
      this.logger.error('Failed to fetch folders:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
