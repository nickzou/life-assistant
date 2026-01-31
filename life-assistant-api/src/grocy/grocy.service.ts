import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  RecipeFulfillment,
  ShoppingList,
  ShoppingListItem,
  EnrichedShoppingListItem,
  MealPlanItem,
  Product,
  QuantityUnit,
} from './grocy.types';

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
   * Note: Grocy requires Base64-encoded filenames for the files endpoint
   */
  async getRecipePicture(
    filename: string,
  ): Promise<{ data: Buffer; contentType: string }> {
    const encodedFilename = Buffer.from(filename).toString('base64');
    const response = await this.axiosInstance.get(
      `/files/recipepictures/${encodedFilename}`,
      {
        responseType: 'arraybuffer',
      },
    );
    return {
      data: response.data,
      contentType: response.headers['content-type'] || 'image/jpeg',
    };
  }

  /**
   * Get meal plan entries for a date range
   */
  async getMealPlanForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<MealPlanItem[]> {
    const response = await this.axiosInstance.get<MealPlanItem[]>(
      `/objects/meal_plan?query[]=day>=${startDate}&query[]=day<=${endDate}`,
    );
    return response.data;
  }

  /**
   * Get recipe fulfillment status (ingredients with stock info)
   */
  async getRecipeFulfillment(recipeId: number): Promise<RecipeFulfillment> {
    const response = await this.axiosInstance.get<RecipeFulfillment>(
      `/recipes/${recipeId}/fulfillment`,
    );
    return response.data;
  }

  /**
   * Add missing ingredients from a recipe to the shopping list
   */
  async addMissingToShoppingList(recipeId: number): Promise<void> {
    await this.axiosInstance.post(
      `/recipes/${recipeId}/add-not-fulfilled-products-to-shoppinglist`,
    );
  }

  /**
   * Get all shopping lists
   */
  async getShoppingLists(): Promise<ShoppingList[]> {
    const response = await this.axiosInstance.get<ShoppingList[]>(
      '/objects/shopping_lists',
    );
    return response.data;
  }

  /**
   * Get shopping list items, optionally filtered by list ID
   */
  async getShoppingListItems(listId?: number): Promise<ShoppingListItem[]> {
    let url = '/objects/shopping_list';
    if (listId !== undefined) {
      url += `?query[]=shopping_list_id=${listId}`;
    }
    const response = await this.axiosInstance.get<ShoppingListItem[]>(url);
    return response.data;
  }

  /**
   * Get all products (for enriching shopping list items)
   */
  async getAllProducts(): Promise<Product[]> {
    const response =
      await this.axiosInstance.get<Product[]>('/objects/products');
    return response.data;
  }

  /**
   * Get all quantity units (for display purposes)
   */
  async getQuantityUnits(): Promise<QuantityUnit[]> {
    const response = await this.axiosInstance.get<QuantityUnit[]>(
      '/objects/quantity_units',
    );
    return response.data;
  }

  /**
   * Get enriched shopping list items with product names
   */
  async getEnrichedShoppingListItems(
    listId?: number,
  ): Promise<EnrichedShoppingListItem[]> {
    const [items, products, quantityUnits] = await Promise.all([
      this.getShoppingListItems(listId),
      this.getAllProducts(),
      this.getQuantityUnits(),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const quMap = new Map(quantityUnits.map((qu) => [qu.id, qu]));

    return items.map((item) => {
      const product = item.product_id ? productMap.get(item.product_id) : null;
      const qu = product ? quMap.get(product.qu_id_stock) : null;
      return {
        ...item,
        product_name: product?.name,
        qu_name: qu?.name,
      };
    });
  }
}
