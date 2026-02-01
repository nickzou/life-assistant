/**
 * Grocy API types for shopping list functionality
 */

export interface RecipeProduct {
  product_id: number;
  product_name: string;
  amount: number;
  qu_id: number;
  stock_amount: number;
  missing_amount: number;
}

export interface RecipeFulfillment {
  recipe_id: number;
  need_fulfilled: boolean;
  need_fulfilled_with_shopping_list: boolean;
  missing_products_count: number;
  products: RecipeProduct[];
}

export interface ShoppingList {
  id: number;
  name: string;
  description?: string;
}

export interface ShoppingListItem {
  id: number;
  product_id: number | null;
  note?: string;
  amount: number;
  done: boolean;
  shopping_list_id: number;
}

export interface EnrichedShoppingListItem extends ShoppingListItem {
  product_name?: string;
  qu_name?: string;
}

export interface MealPlanItem {
  id: number;
  day: string;
  type: string;
  recipe_id?: number;
  product_id?: number;
  note?: string;
  servings?: number;
}

export interface GenerateShoppingListRequest {
  startDate: string;
  endDate: string;
}

export interface GenerateShoppingListResponse {
  addedRecipes: number;
  items: EnrichedShoppingListItem[];
}

export interface Product {
  id: number;
  name: string;
  qu_id_stock: number;
}

export interface QuantityUnit {
  id: number;
  name: string;
  name_plural?: string;
}

/**
 * Recipe ingredient from /objects/recipes_pos
 */
export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  product_id: number;
  amount: number;
  qu_id: number;
}

/**
 * Recipe nesting (included recipes) from /objects/recipes_nestings
 */
export interface RecipeNesting {
  id: number;
  recipe_id: number;
  includes_recipe_id: number;
  servings: number;
}

/**
 * Extended recipe with product_id (indicates this recipe produces a product)
 */
export interface Recipe {
  id: number;
  name: string;
  base_servings: number;
  desired_servings: number;
  product_id?: number;
}

/**
 * Final shopping list item from smart generation
 */
export interface SmartShoppingListItem {
  product_id: number;
  product_name: string;
  needed_amount: number;
  stock_amount: number;
  to_buy_amount: number;
  qu_id: number;
  qu_name?: string;
}

/**
 * Response from smart shopping list generation
 */
export interface SmartGenerateShoppingListResponse {
  startDate: string;
  endDate: string;
  recipesProcessed: number;
  homemadeProductsResolved: number;
  items: SmartShoppingListItem[];
}

/**
 * Request to add items to Grocy shopping list
 */
export interface AddItemsToShoppingListRequest {
  items: SmartShoppingListItem[];
}
