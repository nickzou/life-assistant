import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  WrikeTasksResponse,
  WrikeWorkflowsResponse,
  WrikeContactsResponse,
  WrikeWebhooksResponse,
} from './types/wrike-api.types';

@Injectable()
export class WrikeService implements OnModuleInit {
  private readonly logger = new Logger(WrikeService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://www.wrike.com/api/v4';
  private currentUserId: string | null = null;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('WRIKE_TOKEN');

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Lifecycle hook: Fetch and cache the current user ID when module initializes
   */
  async onModuleInit() {
    try {
      this.logger.log('Initializing Wrike service - fetching current user...');
      const userResponse = await this.getCurrentUser();
      if (userResponse.data && userResponse.data.length > 0) {
        this.currentUserId = userResponse.data[0].id;
        this.logger.log(
          `Wrike user ID cached: ${this.currentUserId} (${userResponse.data[0].firstName} ${userResponse.data[0].lastName})`,
        );
      } else {
        this.logger.warn('No user data returned from Wrike API');
      }
    } catch (error) {
      this.logger.error(
        'Failed to fetch current user ID during initialization:',
        error.message,
      );
      this.logger.error(
        'Task assignment filtering will not work until this is resolved',
      );
    }
  }

  /**
   * Get the cached current user ID
   * Returns null if not yet initialized or if initialization failed
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Fetch a specific task by ID
   */
  async getTask(taskId: string): Promise<WrikeTasksResponse> {
    try {
      this.logger.log(`Fetching Wrike task: ${taskId}`);
      const response = await this.axiosInstance.get<WrikeTasksResponse>(
        `/tasks/${taskId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch Wrike task ${taskId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, taskData: any): Promise<any> {
    try {
      this.logger.log(`Updating Wrike task: ${taskId}`);
      this.logger.log(`Task data: ${JSON.stringify(taskData, null, 2)}`);
      const response = await this.axiosInstance.put(
        `/tasks/${taskId}`,
        taskData,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to update Wrike task ${taskId}:`,
        error.message,
      );
      this.logger.error(
        `Wrike API error details:`,
        JSON.stringify(error.response?.data, null, 2),
      );
      throw error;
    }
  }

  /**
   * Get custom statuses for the account
   * This will help us understand the status structure
   */
  async getCustomStatuses(): Promise<WrikeWorkflowsResponse> {
    try {
      this.logger.log('Fetching Wrike custom statuses');
      const response =
        await this.axiosInstance.get<WrikeWorkflowsResponse>('/workflows');
      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to fetch Wrike custom statuses:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get current authenticated user's contact information
   * This returns the user ID which can be used to filter tasks assigned to you
   */
  async getCurrentUser(): Promise<WrikeContactsResponse> {
    try {
      this.logger.log('Fetching current Wrike user information');
      const response = await this.axiosInstance.get<WrikeContactsResponse>(
        '/contacts',
        {
          params: { me: true },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch current user:', error.message);
      throw error;
    }
  }

  /**
   * Create a new webhook
   * @param hookUrl - The public URL where Wrike will send webhook events
   */
  async createWebhook(hookUrl: string): Promise<WrikeWebhooksResponse> {
    try {
      this.logger.log(`Creating Wrike webhook for URL: ${hookUrl}`);

      const response = await this.axiosInstance.post<WrikeWebhooksResponse>(
        '/webhooks',
        null,
        {
          params: { hookUrl },
        },
      );

      this.logger.log(
        `Webhook created successfully: ${response.data.data[0]?.id}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create webhook:', error.message);
      this.logger.error('Error details:', error.response?.data);
      throw error;
    }
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<WrikeWebhooksResponse> {
    try {
      this.logger.log('Fetching all webhooks');
      const response =
        await this.axiosInstance.get<WrikeWebhooksResponse>('/webhooks');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch webhooks:', error.message);
      throw error;
    }
  }

  /**
   * Delete a webhook by ID
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      this.logger.log(`Deleting webhook: ${webhookId}`);
      await this.axiosInstance.delete(`/webhooks/${webhookId}`);
      this.logger.log(`Webhook deleted: ${webhookId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete webhook ${webhookId}:`,
        error.message,
      );
      throw error;
    }
  }
}
