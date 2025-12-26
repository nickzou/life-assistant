import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  WrikeTasksResponse,
  WrikeWorkflowsResponse,
  WrikeFoldersResponse,
} from './types/wrike-api.types';

@Injectable()
export class WrikeService {
  private readonly logger = new Logger(WrikeService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://www.wrike.com/api/v4';

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
}
