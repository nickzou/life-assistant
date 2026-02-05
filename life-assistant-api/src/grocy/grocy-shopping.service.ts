import { Injectable, Logger } from '@nestjs/common';
import { GrocyService } from './grocy.service';
import { GrocyRecipeService } from './grocy-recipe.service';
import { GrocyMealPlanService } from './grocy-meal-plan.service';
import {
  ShoppingList,
  ShoppingListItem,
  EnrichedShoppingListItem,
  SmartShoppingListItem,
  SmartGenerateShoppingListResponse,
  RecipeIngredient,
  RecipeNesting,
} from './grocy.types';

@Injectable()
export class GrocyShoppingService {
  private readonly logger = new Logger(GrocyShoppingService.name);

  constructor(
    private readonly grocyService: GrocyService,
    private readonly grocyRecipeService: GrocyRecipeService,
    private readonly grocyMealPlanService: GrocyMealPlanService,
  ) {}

  /**
   * Get all shopping lists
   */
  async getShoppingLists(): Promise<ShoppingList[]> {
    return this.grocyService.getShoppingLists();
  }

  /**
   * Get shopping list items, optionally filtered by list ID
   */
  async getShoppingListItems(listId?: number): Promise<ShoppingListItem[]> {
    return this.grocyService.getShoppingListItems(listId);
  }

  /**
   * Update shopping list item done status
   */
  async updateShoppingListItemDone(
    itemId: number,
    done: boolean,
  ): Promise<void> {
    return this.grocyService.updateShoppingListItemDone(itemId, done);
  }

  /**
   * Get enriched shopping list items with product names
   */
  async getEnrichedShoppingListItems(
    listId?: number,
  ): Promise<EnrichedShoppingListItem[]> {
    return this.grocyService.getEnrichedShoppingListItems(listId);
  }

  /**
   * Add missing ingredients from a recipe to the shopping list
   */
  async addMissingToShoppingList(recipeId: number): Promise<void> {
    return this.grocyService.addMissingToShoppingList(recipeId);
  }

  /**
   * Add items to Grocy's shopping list
   */
  async addItemsToShoppingList(
    items: SmartShoppingListItem[],
  ): Promise<{ added: number; failed: number }> {
    return this.grocyService.addItemsToShoppingList(items);
  }

  /**
   * Add products that are below their defined minimum stock amount to the shopping list
   */
  async addMissingProductsToShoppingList(listId?: number): Promise<void> {
    return this.grocyService.addMissingProductsToShoppingList(listId);
  }

  /**
   * Generate a smart shopping list that resolves homemade products to base ingredients
   */
  async generateSmartShoppingList(
    startDate: string,
    endDate: string,
  ): Promise<SmartGenerateShoppingListResponse> {
    this.logger.log(
      `Generating smart shopping list for ${startDate} to ${endDate}`,
    );

    // Fetch all data in parallel
    const [
      meals,
      recipes,
      ingredients,
      nestings,
      stock,
      products,
      quantityUnits,
    ] = await Promise.all([
      this.grocyMealPlanService.getMealPlanForDateRange(startDate, endDate),
      this.grocyRecipeService.getAllRecipes(),
      this.grocyRecipeService.getRecipeIngredients(),
      this.grocyRecipeService.getRecipeNestings(),
      this.grocyService.getStock(),
      this.grocyService.getAllProducts(),
      this.grocyService.getQuantityUnits(),
    ]);

    // Build lookup maps
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const quMap = new Map(quantityUnits.map((qu) => [qu.id, qu]));
    const homemadeProductMap =
      this.grocyRecipeService.buildHomemadeProductMap(recipes);

    // Build stock map (product_id -> amount in stock)
    const stockMap = new Map<number, number>();
    for (const item of stock) {
      const stockAmount = item.amount_aggregated ?? item.amount;
      stockMap.set(item.product_id, stockAmount);
    }

    // Group ingredients by recipe_id
    const ingredientsByRecipe = new Map<number, RecipeIngredient[]>();
    for (const ingredient of ingredients) {
      const list = ingredientsByRecipe.get(ingredient.recipe_id) || [];
      list.push(ingredient);
      ingredientsByRecipe.set(ingredient.recipe_id, list);
    }

    // Group nestings (included recipes) by parent recipe_id
    const nestingsByRecipe = new Map<number, RecipeNesting[]>();
    for (const nesting of nestings) {
      const list = nestingsByRecipe.get(nesting.recipe_id) || [];
      list.push(nesting);
      nestingsByRecipe.set(nesting.recipe_id, list);
    }

    // Aggregate needed amounts across all meals
    const neededAmounts = new Map<number, { amount: number; qu_id: number }>();
    let recipesProcessed = 0;
    let homemadeProductsResolved = 0;

    // Track homemade product stock usage across all meals
    const homemadeStockUsed = new Map<number, number>();

    for (const meal of meals) {
      if (!meal.recipe_id) continue;

      const recipe = recipeMap.get(meal.recipe_id);
      if (!recipe) continue;

      recipesProcessed++;

      // Calculate servings multiplier (meal servings vs recipe base servings)
      const mealServings = meal.recipe_servings || recipe.desired_servings || 1;
      const multiplier = mealServings / (recipe.base_servings || 1);

      // Resolve recipe ingredients (recursively handling homemade products and included recipes)
      const visited = new Set<number>();
      const resolvedIngredients =
        this.grocyRecipeService.resolveRecipeIngredients(
          meal.recipe_id,
          multiplier,
          ingredientsByRecipe,
          nestingsByRecipe,
          recipeMap,
          homemadeProductMap,
          stockMap,
          homemadeStockUsed,
          visited,
        );

      // Track homemade products resolved (visited recipes minus the main recipe)
      homemadeProductsResolved += visited.size - 1;

      // Aggregate into needed amounts
      for (const [productId, data] of resolvedIngredients) {
        const existing = neededAmounts.get(productId);
        if (existing) {
          existing.amount += data.amount;
        } else {
          neededAmounts.set(productId, { ...data });
        }
      }
    }

    // Log homemade stock usage
    for (const [productId, used] of homemadeStockUsed) {
      const product = productMap.get(productId);
      this.logger.log(
        `Used ${used} of homemade product "${product?.name || productId}" from stock`,
      );
    }

    // Build final shopping list items
    const items: SmartShoppingListItem[] = [];

    for (const [productId, data] of neededAmounts) {
      const stockAmount = stockMap.get(productId) || 0;
      const toBuyAmount = Math.max(0, data.amount - stockAmount);

      // Only include items we actually need to buy
      if (toBuyAmount > 0) {
        const product = productMap.get(productId);
        const qu = quMap.get(data.qu_id);

        items.push({
          product_id: productId,
          product_name: product?.name || `Unknown (${productId})`,
          needed_amount: data.amount,
          stock_amount: stockAmount,
          to_buy_amount: toBuyAmount,
          qu_id: data.qu_id,
          qu_name: qu?.name,
        });
      }
    }

    // Sort by product name
    items.sort((a, b) => a.product_name.localeCompare(b.product_name));

    this.logger.log(
      `Smart shopping list: ${recipesProcessed} recipes, ${homemadeProductsResolved} homemade resolved, ${items.length} items to buy`,
    );

    return {
      startDate,
      endDate,
      recipesProcessed,
      homemadeProductsResolved,
      items,
    };
  }
}
