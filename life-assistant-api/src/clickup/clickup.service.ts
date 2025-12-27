import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ClickUpTask,
  ClickUpTasksResponse,
  ClickUpSpacesResponse,
  ClickUpListsResponse,
} from './types/clickup-api.types';

@Injectable()
export class ClickUpService {
  private readonly logger = new Logger(ClickUpService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://api.clickup.com/api/v2';

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
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    taskData: { name?: string; description?: string; status?: string; priority?: number },
  ): Promise<ClickUpTask> {
    try {
      this.logger.log(`Updating ClickUp task: ${taskId}`);
      const response = await this.axiosInstance.put<ClickUpTask>(`/task/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update ClickUp task ${taskId}:`, error.message);
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
}
