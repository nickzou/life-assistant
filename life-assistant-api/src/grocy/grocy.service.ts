import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class GrocyService implements OnModuleInit {
  private readonly logger = new Logger(GrocyService.name);
  private axiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('GROCY_URL');
    const apiKey = this.configService.get<string>('GROCY_API_KEY');

    if (!baseUrl || !apiKey) {
      this.logger.warn('GROCY_URL or GROCY_API_KEY not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: `${baseUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'GROCY-API-KEY': apiKey,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Grocy service - testing connection...');
    try {
      await this.getSystemInfo();
      this.logger.log('Grocy connection successful');
    } catch (error) {
      this.logger.warn(`Grocy connection failed: ${error.message}`);
    }
  }

  /**
   * Get system info to verify connection
   */
  async getSystemInfo(): Promise<any> {
    const response = await this.axiosInstance.get('/system/info');
    return response.data;
  }

  /**
   * Get all products
   */
  async getProducts(): Promise<any[]> {
    const response = await this.axiosInstance.get('/objects/products');
    return response.data;
  }

  /**
   * Get current stock
   */
  async getStock(): Promise<any[]> {
    const response = await this.axiosInstance.get('/stock');
    return response.data;
  }

  /**
   * Get stock for a specific product
   */
  async getProductStock(productId: number): Promise<any> {
    const response = await this.axiosInstance.get(
      `/stock/products/${productId}`,
    );
    return response.data;
  }

  /**
   * Get all meal plan entries
   */
  async getMealPlan(): Promise<any[]> {
    const response = await this.axiosInstance.get('/objects/meal_plan');
    return response.data;
  }

  /**
   * Get meal plan for a specific date range
   */
  async getMealPlanForDate(date: string): Promise<any[]> {
    const response = await this.axiosInstance.get(
      `/objects/meal_plan?query[]=day=${date}`,
    );
    return response.data;
  }

  /**
   * Get all recipes
   */
  async getRecipes(): Promise<any[]> {
    const response = await this.axiosInstance.get('/objects/recipes');
    return response.data;
  }

  /**
   * Get a specific recipe with details
   */
  async getRecipe(recipeId: number): Promise<any> {
    const response = await this.axiosInstance.get(
      `/objects/recipes/${recipeId}`,
    );
    return response.data;
  }

  /**
   * Get all chores
   */
  async getChores(): Promise<any[]> {
    const response = await this.axiosInstance.get('/chores');
    return response.data;
  }

  /**
   * Get all tasks
   */
  async getTasks(): Promise<any[]> {
    const response = await this.axiosInstance.get('/tasks');
    return response.data;
  }

  /**
   * Get a recipe picture as a buffer
   */
  async getRecipePicture(
    filename: string,
  ): Promise<{ data: Buffer; contentType: string }> {
    const response = await this.axiosInstance.get(
      `/files/recipepictures/${encodeURIComponent(filename)}`,
      {
        responseType: 'arraybuffer',
      },
    );
    return {
      data: response.data,
      contentType: response.headers['content-type'] || 'image/jpeg',
    };
  }
}
