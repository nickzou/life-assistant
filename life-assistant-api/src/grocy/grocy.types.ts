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
