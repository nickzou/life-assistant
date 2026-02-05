import { Injectable, Logger } from '@nestjs/common';
import { GrocyService } from './grocy.service';
import {
  Recipe,
  RecipeFulfillment,
  RecipeIngredient,
  RecipeNesting,
  RecipeSelectionItem,
} from './grocy.types';

@Injectable()
export class GrocyRecipeService {
  private readonly logger = new Logger(GrocyRecipeService.name);

  constructor(private readonly grocyService: GrocyService) {}

  /**
   * Get all recipes
   */
  async getRecipes(): Promise<Recipe[]> {
    return this.grocyService.getRecipes();
  }

  /**
   * Get all recipes with full details
   */
  async getAllRecipes(): Promise<Recipe[]> {
    return this.grocyService.getAllRecipes();
  }

  /**
   * Get a specific recipe with details
   */
  async getRecipe(recipeId: number): Promise<Recipe> {
    return this.grocyService.getRecipe(recipeId);
  }

  /**
   * Get all recipe nestings (included recipes)
   */
  async getRecipeNestings(): Promise<RecipeNesting[]> {
    return this.grocyService.getRecipeNestings();
  }

  /**
   * Get all recipe ingredients (recipes_pos table)
   */
  async getRecipeIngredients(): Promise<RecipeIngredient[]> {
    return this.grocyService.getRecipeIngredients();
  }

  /**
   * Get a recipe picture as a buffer
   */
  async getRecipePicture(
    filename: string,
  ): Promise<{ data: Buffer; contentType: string }> {
    return this.grocyService.getRecipePicture(filename);
  }

  /**
   * Get recipe fulfillment status (ingredients with stock info)
   */
  async getRecipeFulfillment(recipeId: number): Promise<RecipeFulfillment> {
    return this.grocyService.getRecipeFulfillment(recipeId);
  }

  /**
   * Consume a recipe (deduct ingredients from stock)
   */
  async consumeRecipe(recipeId: number, servings?: number): Promise<void> {
    return this.grocyService.consumeRecipe(recipeId, servings);
  }

  /**
   * Get lightweight recipe list for selection dropdowns
   */
  async getRecipesForSelection(): Promise<RecipeSelectionItem[]> {
    return this.grocyService.getRecipesForSelection();
  }

  /**
   * Get all homemade products (products that are produced by recipes)
   */
  async getHomemadeProducts(): Promise<
    {
      product_id: number;
      product_name: string;
      recipe_id: number;
      recipe_name: string;
    }[]
  > {
    return this.grocyService.getHomemadeProducts();
  }

  /**
   * Build a map of product_id -> recipe that produces it
   * This identifies "homemade" products
   */
  buildHomemadeProductMap(recipes: Recipe[]): Map<number, Recipe> {
    const map = new Map<number, Recipe>();
    for (const recipe of recipes) {
      if (recipe.product_id) {
        map.set(recipe.product_id, recipe);
      }
    }
    return map;
  }

  /**
   * Recursively resolve recipe ingredients, replacing homemade products with their base ingredients
   * Also handles included recipes (nestings)
   * Only resolves homemade products if they're not in stock (or partially resolves for the deficit)
   */
  resolveRecipeIngredients(
    recipeId: number,
    servingsMultiplier: number,
    ingredientsByRecipe: Map<number, RecipeIngredient[]>,
    nestingsByRecipe: Map<number, RecipeNesting[]>,
    recipeMap: Map<number, Recipe>,
    homemadeProductMap: Map<number, Recipe>,
    stockMap: Map<number, number>,
    homemadeStockUsed: Map<number, number>,
    visited: Set<number>,
  ): Map<number, { amount: number; qu_id: number }> {
    const result = new Map<number, { amount: number; qu_id: number }>();

    // Check for circular dependency
    if (visited.has(recipeId)) {
      this.logger.warn(
        `Circular dependency detected for recipe ${recipeId}, skipping`,
      );
      return result;
    }
    visited.add(recipeId);

    // Process direct ingredients
    const ingredients = ingredientsByRecipe.get(recipeId) || [];

    for (const ingredient of ingredients) {
      const productId = ingredient.product_id;
      const amount = ingredient.amount * servingsMultiplier;
      const homemadeRecipe = homemadeProductMap.get(productId);

      if (homemadeRecipe) {
        // This is a homemade product - check if we have it in stock
        const totalStock = stockMap.get(productId) || 0;
        const alreadyUsed = homemadeStockUsed.get(productId) || 0;
        const availableStock = Math.max(0, totalStock - alreadyUsed);

        if (availableStock >= amount) {
          // Have enough in stock - use it, don't resolve to base ingredients
          homemadeStockUsed.set(productId, alreadyUsed + amount);
          this.logger.debug(
            `Using ${amount} of homemade product ${productId} from stock (${availableStock} available)`,
          );
        } else {
          // Not enough in stock - use what we have, resolve the rest
          const amountFromStock = availableStock;
          const amountToMake = amount - amountFromStock;

          if (amountFromStock > 0) {
            homemadeStockUsed.set(productId, alreadyUsed + amountFromStock);
            this.logger.debug(
              `Using ${amountFromStock} of homemade product ${productId} from stock, need to make ${amountToMake} more`,
            );
          }

          // Recursively resolve ingredients for what we need to make
          const nestedMultiplier =
            amountToMake / (homemadeRecipe.base_servings || 1);
          const nestedIngredients = this.resolveRecipeIngredients(
            homemadeRecipe.id,
            nestedMultiplier,
            ingredientsByRecipe,
            nestingsByRecipe,
            recipeMap,
            homemadeProductMap,
            stockMap,
            homemadeStockUsed,
            visited,
          );

          // Merge nested ingredients into result
          for (const [nestedProductId, nestedData] of nestedIngredients) {
            const existing = result.get(nestedProductId);
            if (existing) {
              existing.amount += nestedData.amount;
            } else {
              result.set(nestedProductId, { ...nestedData });
            }
          }
        }
      } else {
        // This is a purchasable product - add to result
        const existing = result.get(productId);
        if (existing) {
          existing.amount += amount;
        } else {
          result.set(productId, { amount, qu_id: ingredient.qu_id });
        }
      }
    }

    // Process included recipes (nestings)
    const nestings = nestingsByRecipe.get(recipeId) || [];
    for (const nesting of nestings) {
      const includedRecipe = recipeMap.get(nesting.includes_recipe_id);
      if (!includedRecipe) continue;

      // Calculate multiplier: nesting.servings is how many servings of the included recipe to use
      const nestedMultiplier =
        (nesting.servings * servingsMultiplier) /
        (includedRecipe.base_servings || 1);

      const nestedIngredients = this.resolveRecipeIngredients(
        nesting.includes_recipe_id,
        nestedMultiplier,
        ingredientsByRecipe,
        nestingsByRecipe,
        recipeMap,
        homemadeProductMap,
        stockMap,
        homemadeStockUsed,
        visited,
      );

      // Merge nested ingredients into result
      for (const [nestedProductId, nestedData] of nestedIngredients) {
        const existing = result.get(nestedProductId);
        if (existing) {
          existing.amount += nestedData.amount;
        } else {
          result.set(nestedProductId, { ...nestedData });
        }
      }
    }

    return result;
  }
}
