import { Controller, Get, Param } from '@nestjs/common';
import { GrocyService } from './grocy.service';

@Controller('grocy')
export class GrocyController {
  constructor(private readonly grocyService: GrocyService) {}

  /**
   * Test endpoint - get system info
   */
  @Get('test/info')
  async getSystemInfo() {
    return this.grocyService.getSystemInfo();
  }

  /**
   * Test endpoint - get all products
   */
  @Get('test/products')
  async getProducts() {
    return this.grocyService.getProducts();
  }

  /**
   * Test endpoint - get current stock
   */
  @Get('test/stock')
  async getStock() {
    return this.grocyService.getStock();
  }

  /**
   * Test endpoint - get stock for a specific product
   */
  @Get('test/stock/:productId')
  async getProductStock(@Param('productId') productId: string) {
    return this.grocyService.getProductStock(parseInt(productId, 10));
  }

  /**
   * Test endpoint - get meal plan
   */
  @Get('test/meal-plan')
  async getMealPlan() {
    return this.grocyService.getMealPlan();
  }

  /**
   * Test endpoint - get meal plan for a specific date
   */
  @Get('test/meal-plan/:date')
  async getMealPlanForDate(@Param('date') date: string) {
    return this.grocyService.getMealPlanForDate(date);
  }

  /**
   * Test endpoint - get all recipes
   */
  @Get('test/recipes')
  async getRecipes() {
    return this.grocyService.getRecipes();
  }

  /**
   * Test endpoint - get a specific recipe
   */
  @Get('test/recipes/:recipeId')
  async getRecipe(@Param('recipeId') recipeId: string) {
    return this.grocyService.getRecipe(parseInt(recipeId, 10));
  }

  /**
   * Test endpoint - get all chores
   */
  @Get('test/chores')
  async getChores() {
    return this.grocyService.getChores();
  }

  /**
   * Test endpoint - get all tasks
   */
  @Get('test/tasks')
  async getTasks() {
    return this.grocyService.getTasks();
  }
}
