import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { GrocyService } from './grocy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('grocy')
export class GrocyController {
  constructor(private readonly grocyService: GrocyService) {}

  /**
   * Get today's meal plan
   * GET /grocy/meal-plan/today
   */
  @UseGuards(JwtAuthGuard)
  @Get('meal-plan/today')
  async getTodaysMealPlan() {
    const today = new Date().toISOString().split('T')[0];
    const mealPlan = await this.grocyService.getMealPlanForDate(today);

    // Enrich with recipe details
    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe };
        }
        return meal;
      }),
    );

    return {
      date: today,
      meals: enrichedMealPlan,
    };
  }

  /**
   * Get meal plan for a specific date
   * GET /grocy/meal-plan/date/:date
   */
  @UseGuards(JwtAuthGuard)
  @Get('meal-plan/date/:date')
  async getMealPlanByDate(@Param('date') date: string) {
    const mealPlan = await this.grocyService.getMealPlanForDate(date);

    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe };
        }
        return meal;
      }),
    );

    return {
      date,
      meals: enrichedMealPlan,
    };
  }

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

  /**
   * Proxy endpoint for recipe pictures
   * GET /grocy/recipes/:recipeId/picture
   */
  @UseGuards(JwtAuthGuard)
  @Get('recipes/:recipeId/picture')
  async getRecipePicture(
    @Param('recipeId') recipeId: string,
    @Res() res: Response,
  ) {
    const recipe = await this.grocyService.getRecipe(parseInt(recipeId, 10));

    if (!recipe.picture_file_name) {
      res.status(404).send('No picture available');
      return;
    }

    const { data, contentType } = await this.grocyService.getRecipePicture(
      recipe.picture_file_name,
    );

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(data);
  }
}
