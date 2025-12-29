import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  WrikeTasksResponse,
  WrikeWorkflowsResponse,
  WrikeFoldersResponse,
  WrikeContactsResponse,
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
        'Authorization': `Bearer ${token}`,
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
        this.logger.log(`Wrike user ID cached: ${this.currentUserId} (${userResponse.data[0].firstName} ${userResponse.data[0].lastName})`);
      } else {
        this.logger.warn('No user data returned from Wrike API');
      }
    } catch (error) {
      this.logger.error('Failed to fetch current user ID during initialization:', error.message);
      this.logger.error('Task assignment filtering will not work until this is resolved');
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
      const response = await this.axiosInstance.get<WrikeTasksResponse>(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch Wrike task ${taskId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch tasks from a specific folder
   */
  async getTasksInFolder(folderId: string): Promise<WrikeTasksResponse> {
    try {
      this.logger.log(`Fetching tasks from Wrike folder: ${folderId}`);
      const response = await this.axiosInstance.get<WrikeTasksResponse>(`/folders/${folderId}/tasks`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch tasks from folder ${folderId}:`, error.message);
      this.logger.error(`Wrike API error:`, JSON.stringify(error.response?.data));
      throw error;
    }
  }

  /**
   * Create a new task in Wrike
   */
  async createTask(folderId: string, taskData: any): Promise<any> {
    try {
      this.logger.log(`Creating task in Wrike folder: ${folderId}`);
      const response = await this.axiosInstance.post(`/folders/${folderId}/tasks`, taskData);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create Wrike task:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, taskData: any): Promise<any> {
    try {
      this.logger.log(`Updating Wrike task: ${taskId}`);
      const response = await this.axiosInstance.put(`/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update Wrike task ${taskId}:`, error.message);
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
      const response = await this.axiosInstance.get<WrikeWorkflowsResponse>('/workflows');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch Wrike custom statuses:', error.message);
      throw error;
    }
  }

  /**
   * Get all folders
   */
  async getAllFolders(): Promise<WrikeFoldersResponse> {
    try {
      this.logger.log('Fetching all Wrike folders');
      const response = await this.axiosInstance.get<WrikeFoldersResponse>('/folders');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch folders:', error.message);
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
      const response = await this.axiosInstance.get<WrikeContactsResponse>('/contacts', {
        params: { me: true }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch current user:', error.message);
      throw error;
    }
  }
}
