import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  RecipeFulfillment,
  ShoppingList,
  ShoppingListItem,
  EnrichedShoppingListItem,
  MealPlanItem,
  MealPlanSection,
  Product,
  QuantityUnit,
  RecipeIngredient,
  RecipeNesting,
  Recipe,
  SmartShoppingListItem,
  SmartGenerateShoppingListResponse,
  CreateMealPlanItemDto,
  RecipeSelectionItem,
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
   * Get all meal plan sections
   */
  async getMealPlanSections(): Promise<MealPlanSection[]> {
    const response = await this.axiosInstance.get<MealPlanSection[]>(
      '/objects/meal_plan_sections',
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
   * Get all recipe nestings (included recipes)
   */
  async getRecipeNestings(): Promise<any[]> {
    const response = await this.axiosInstance.get('/objects/recipes_nestings');
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
   * Update shopping list item done status
   * This marks the item as checked off without adding to stock
   */
  async updateShoppingListItemDone(
    itemId: number,
    done: boolean,
  ): Promise<void> {
    await this.axiosInstance.put(`/objects/shopping_list/${itemId}`, {
      done: done ? 1 : 0,
    });
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

  /**
   * Get all recipe ingredients (recipes_pos table)
   */
  async getRecipeIngredients(): Promise<RecipeIngredient[]> {
    const response = await this.axiosInstance.get<RecipeIngredient[]>(
      '/objects/recipes_pos',
    );
    return response.data;
  }

  /**
   * Get all recipes with full details including product_id
   */
  async getAllRecipes(): Promise<Recipe[]> {
    const response = await this.axiosInstance.get<Recipe[]>('/objects/recipes');
    return response.data;
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
      this.getMealPlanForDateRange(startDate, endDate),
      this.getAllRecipes(),
      this.getRecipeIngredients(),
      this.getRecipeNestings(),
      this.getStock(),
      this.getAllProducts(),
      this.getQuantityUnits(),
    ]);

    // Build lookup maps
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const quMap = new Map(quantityUnits.map((qu) => [qu.id, qu]));
    const homemadeProductMap = this.buildHomemadeProductMap(recipes);

    // Build stock map (product_id -> amount in stock)
    // Use amount_aggregated if available (includes sub-products), otherwise use amount
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
      // Pass stockMap so we can check if homemade products are in stock
      const visited = new Set<number>();
      const resolvedIngredients = this.resolveRecipeIngredients(
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

  /**
   * Add items to Grocy's shopping list
   */
  async addItemsToShoppingList(
    items: SmartShoppingListItem[],
  ): Promise<{ added: number; failed: number }> {
    let added = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.axiosInstance.post('/stock/shoppinglist/add-product', {
          product_id: item.product_id,
          list_id: 1, // Default shopping list
          product_amount: item.to_buy_amount,
        });
        added++;
      } catch (error) {
        this.logger.warn(
          `Failed to add ${item.product_name} to shopping list: ${error.message}`,
        );
        failed++;
      }
    }

    this.logger.log(`Added ${added} items to shopping list (${failed} failed)`);
    return { added, failed };
  }

  /**
   * Add products that are below their defined minimum stock amount to the shopping list
   * This replicates Grocy's "Add products that are below defined min. stock amount" feature
   */
  async addMissingProductsToShoppingList(listId?: number): Promise<void> {
    this.logger.log(
      `Adding products below min stock to shopping list${listId ? ` (list ${listId})` : ''}`,
    );
    await this.axiosInstance.post('/stock/shoppinglist/add-missing-products', {
      ...(listId !== undefined && { list_id: listId }),
    });
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
    const [recipes, products] = await Promise.all([
      this.getAllRecipes(),
      this.getAllProducts(),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const result: {
      product_id: number;
      product_name: string;
      recipe_id: number;
      recipe_name: string;
    }[] = [];

    for (const recipe of recipes) {
      if (recipe.product_id) {
        const product = productMap.get(recipe.product_id);
        result.push({
          product_id: recipe.product_id,
          product_name: product?.name || `Unknown (${recipe.product_id})`,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
        });
      }
    }

    return result;
  }

  /**
   * Create a new meal plan item
   */
  async createMealPlanItem(data: CreateMealPlanItemDto): Promise<MealPlanItem> {
    const payload = {
      day: data.day,
      type: 'recipe',
      recipe_id: data.recipe_id,
      section_id: data.section_id ?? -1,
      recipe_servings: data.servings || 1,
    };
    this.logger.log(`Creating meal plan item: ${JSON.stringify(payload)}`);
    try {
      const response = await this.axiosInstance.post(
        '/objects/meal_plan',
        payload,
      );
      // Grocy returns the created object ID, fetch the full object
      const createdId = response.data.created_object_id;
      const getResponse = await this.axiosInstance.get<MealPlanItem>(
        `/objects/meal_plan/${createdId}`,
      );
      return getResponse.data;
    } catch (error) {
      this.logger.error(
        `Grocy API error: ${JSON.stringify(error.response?.data)}`,
      );
      throw error;
    }
  }

  /**
   * Delete a meal plan item
   */
  async deleteMealPlanItem(id: number): Promise<void> {
    this.logger.log(`Deleting meal plan item ${id}`);
    await this.axiosInstance.delete(`/objects/meal_plan/${id}`);
  }

  /**
   * Consume a recipe (deduct ingredients from stock)
   */
  async consumeRecipe(recipeId: number, servings?: number): Promise<void> {
    this.logger.log(
      `Consuming recipe ${recipeId} with ${servings || 'default'} servings`,
    );
    await this.axiosInstance.post(`/recipes/${recipeId}/consume`, null, {
      params: servings ? { servings } : undefined,
    });
  }

  /**
   * Update meal plan item done status
   */
  async updateMealPlanItemDone(id: number, done: boolean): Promise<void> {
    this.logger.log(`Updating meal plan item ${id} done status to ${done}`);
    await this.axiosInstance.put(`/objects/meal_plan/${id}`, {
      done: done ? 1 : 0,
    });
  }

  /**
   * Update a meal plan item
   */
  async updateMealPlanItem(
    id: number,
    data: { section_id?: number; recipe_servings?: number; day?: string },
  ): Promise<void> {
    this.logger.log(`Updating meal plan item ${id}: ${JSON.stringify(data)}`);
    await this.axiosInstance.put(`/objects/meal_plan/${id}`, data);
  }

  /**
   * Get lightweight recipe list for selection dropdowns
   * Filters out internal Grocy meal plan entries (negative IDs, mealplan-* types)
   */
  async getRecipesForSelection(): Promise<RecipeSelectionItem[]> {
    const recipes = await this.getAllRecipes();
    return recipes
      .filter((recipe) => {
        // Filter out internal meal plan entries
        if (recipe.id < 0) return false;
        if (recipe.type?.startsWith('mealplan-')) return false;
        return true;
      })
      .map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        picture_url: undefined, // Will be populated by controller if needed
        base_servings: recipe.base_servings,
      }));
  }
}
