import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ClickUpTask,
  ClickUpTasksResponse,
  ClickUpSpacesResponse,
  ClickUpListsResponse,
} from './types/clickup-api.types';

@Injectable()
export class ClickUpService implements OnModuleInit {
  private readonly logger = new Logger(ClickUpService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://api.clickup.com/api/v2';
  private currentUserId: number | null = null;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('CLICKUP_TOKEN');

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Lifecycle hook: Fetch and cache the current user ID when module initializes
   */
  async onModuleInit() {
    try {
      this.logger.log('Initializing ClickUp service - fetching current user...');
      const userResponse = await this.getAuthorizedUser();
      if (userResponse.user) {
        this.currentUserId = userResponse.user.id;
        this.logger.log(`ClickUp user ID cached: ${this.currentUserId} (${userResponse.user.username})`);
      } else {
        this.logger.warn('No user data returned from ClickUp API');
      }
    } catch (error) {
      this.logger.error('Failed to fetch current user ID during initialization:', error.message);
      this.logger.error('Auto-assignment will not work until this is resolved');
    }
  }

  /**
   * Get the cached current user ID
   * Returns null if not yet initialized or if initialization failed
   */
  getCurrentUserId(): number | null {
    return this.currentUserId;
  }

  /**
   * Get authorized user information
   * Returns the authenticated user's ClickUp account details
   */
  async getAuthorizedUser(): Promise<any> {
    try {
      this.logger.log('Fetching authorized ClickUp user');
      const response = await this.axiosInstance.get('/user');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch authorized user:', error.message);
      throw error;
    }
  }

  /**
   * Fetch a specific task by ID
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    try {
      this.logger.log(`Fetching ClickUp task: ${taskId}`);
      const response = await this.axiosInstance.get<ClickUpTask>(`/task/${taskId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch ClickUp task ${taskId}:`, error.message);
      this.logger.error(`ClickUp API error:`, JSON.stringify(error.response?.data));
      throw error;
    }
  }

  /**
   * Fetch tasks from a specific list
   */
  async getTasksInList(listId: string): Promise<ClickUpTasksResponse> {
    try {
      this.logger.log(`Fetching tasks from ClickUp list: ${listId}`);
      const response = await this.axiosInstance.get<ClickUpTasksResponse>(`/list/${listId}/task`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch tasks from list ${listId}:`, error.message);
      this.logger.error(`ClickUp API error:`, JSON.stringify(error.response?.data));
      throw error;
    }
  }

  /**
   * Create a new task in ClickUp
   */
  async createTask(
    listId: string,
    taskData: { name: string; description?: string; status?: string; priority?: number },
  ): Promise<ClickUpTask> {
    try {
      this.logger.log(`Creating task in ClickUp list: ${listId}`);
      const response = await this.axiosInstance.post<ClickUpTask>(`/list/${listId}/task`, taskData);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create ClickUp task:`, error.message);
      throw error;
    }
  }

  /**
   * Get a specific list by ID
   */
  async getList(listId: string): Promise<any> {
    try {
      this.logger.log(`Fetching ClickUp list: ${listId}`);
      const response = await this.axiosInstance.get(`/list/${listId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch list ${listId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all lists in a space
   */
  async getListsInSpace(spaceId: string): Promise<ClickUpListsResponse> {
    try {
      this.logger.log(`Fetching lists from ClickUp space: ${spaceId}`);
      const response = await this.axiosInstance.get<ClickUpListsResponse>(`/space/${spaceId}/list`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch lists from space ${spaceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get spaces in workspace
   */
  async getSpaces(workspaceId: string): Promise<ClickUpSpacesResponse> {
    try {
      this.logger.log(`Fetching ClickUp spaces in workspace: ${workspaceId}`);
      const response = await this.axiosInstance.get<ClickUpSpacesResponse>(`/team/${workspaceId}/space`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch spaces:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, taskData: any): Promise<any> {
    try {
      this.logger.log(`Updating ClickUp task: ${taskId}`);
      const response = await this.axiosInstance.put(`/task/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update task ${taskId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      this.logger.log(`Deleting ClickUp task: ${taskId}`);
      await this.axiosInstance.delete(`/task/${taskId}`);
      this.logger.log(`Successfully deleted ClickUp task: ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to delete task ${taskId}:`, error.message);
      throw error;
    }
  }

  /**
   * List all webhooks for a team
   */
  async listWebhooks(teamId: string): Promise<any> {
    try {
      this.logger.log(`Listing ClickUp webhooks for team: ${teamId}`);
      const response = await this.axiosInstance.get(`/team/${teamId}/webhook`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list webhooks:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new webhook
   */
  async createWebhook(teamId: string, hookUrl: string): Promise<any> {
    try {
      this.logger.log(`Creating ClickUp webhook for team ${teamId}: ${hookUrl}`);
      const response = await this.axiosInstance.post(`/team/${teamId}/webhook`, {
        endpoint: hookUrl,
        events: [
          'taskUpdated',
          'taskStatusUpdated',
          'taskDueDateUpdated',
        ],
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create webhook:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      this.logger.log(`Deleting ClickUp webhook: ${webhookId}`);
      await this.axiosInstance.delete(`/webhook/${webhookId}`);
      this.logger.log(`Successfully deleted ClickUp webhook: ${webhookId}`);
    } catch (error) {
      this.logger.error(`Failed to delete webhook ${webhookId}:`, error.message);
      throw error;
    }
  }

  /**
   * Add a tag to a task
   */
  async addTag(taskId: string, tagName: string): Promise<void> {
    try {
      this.logger.log(`Adding tag "${tagName}" to task ${taskId}`);
      await this.axiosInstance.post(`/task/${taskId}/tag/${tagName}`);
      this.logger.log(`Successfully added tag "${tagName}" to task ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to add tag "${tagName}" to task ${taskId}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove a tag from a task
   */
  async removeTag(taskId: string, tagName: string): Promise<void> {
    try {
      this.logger.log(`Removing tag "${tagName}" from task ${taskId}`);
      await this.axiosInstance.delete(`/task/${taskId}/tag/${tagName}`);
      this.logger.log(`Successfully removed tag "${tagName}" from task ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to remove tag "${tagName}" from task ${taskId}:`, error.message);
      throw error;
    }
  }
}
