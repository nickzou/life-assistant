import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { api, API_BASE_URL } from '../lib/api';
import { formatDateString } from '../lib/date.utils';

interface Recipe {
  id: number;
  name: string;
  description?: string;
  picture_file_name?: string;
  picture_url?: string;
}

interface MealPlanItem {
  id: number;
  day: string;
  type: string;
  recipe_id?: number;
  recipe?: Recipe;
  product_id?: number;
  note?: string;
  servings?: number;
  section_id?: number;
  section_name?: string | null;
}

interface ShoppingListItem {
  id: number;
  product_id: number | null;
  product_name?: string;
  note?: string;
  amount: number;
  done: boolean;
  qu_name?: string;
}

interface ShoppingList {
  id: number;
  name: string;
}

interface MealPlanRangeResponse {
  startDate: string;
  endDate: string;
  meals: MealPlanItem[];
}

interface ShoppingListResponse {
  lists: ShoppingList[];
  items: ShoppingListItem[];
}

interface SmartShoppingListItem {
  product_id: number;
  product_name: string;
  needed_amount: number;
  stock_amount: number;
  to_buy_amount: number;
  qu_id: number;
  qu_name?: string;
}

interface GenerateResponse {
  startDate: string;
  endDate: string;
  recipesProcessed: number;
  homemadeProductsResolved: number;
  items: SmartShoppingListItem[];
}

interface AddItemsResponse {
  added: number;
  failed: number;
}

export const Route = createFileRoute('/shopping')({
  component: ShoppingPage,
});

function getWeekDates(startDate: Date): { start: string; end: string } {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);
  return {
    start: formatDateString(start),
    end: formatDateString(end),
  };
}

function ShoppingPage() {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    return formatDateString(today);
  });
  const [mealPlan, setMealPlan] = useState<MealPlanRangeResponse | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [generatedItems, setGeneratedItems] = useState<SmartShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [addingToGrocy, setAddingToGrocy] = useState(false);
  const [addingMissing, setAddingMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const weekDates = getWeekDates(new Date(selectedWeekStart + 'T00:00:00'));

  const fetchMealPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<MealPlanRangeResponse>(
        `/grocy/meal-plan/range/${weekDates.start}/${weekDates.end}`
      );
      setMealPlan(response.data);
    } catch {
      setError('Failed to fetch meal plan');
    } finally {
      setLoading(false);
    }
  };

  const fetchShoppingList = async () => {
    try {
      const response = await api.get<ShoppingListResponse>('/grocy/shopping-list');
      setShoppingList(response.data.items);
    } catch {
      console.error('Failed to fetch shopping list');
    }
  };

  useEffect(() => {
    fetchMealPlan();
    fetchShoppingList();
  }, [selectedWeekStart]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedItems([]);
    try {
      const response = await api.post<GenerateResponse>('/grocy/shopping-list/generate', {
        startDate: weekDates.start,
        endDate: weekDates.end,
      });
      setGeneratedItems(response.data.items);
      const homemadeText = response.data.homemadeProductsResolved > 0
        ? ` (resolved ${response.data.homemadeProductsResolved} homemade product${response.data.homemadeProductsResolved !== 1 ? 's' : ''})`
        : '';
      setSuccessMessage(
        `Processed ${response.data.recipesProcessed} recipe(s)${homemadeText} - ${response.data.items.length} item(s) to buy`
      );
    } catch {
      setError('Failed to generate shopping list');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToGrocy = async () => {
    if (generatedItems.length === 0) return;

    setAddingToGrocy(true);
    setError(null);
    try {
      const response = await api.post<AddItemsResponse>('/grocy/shopping-list/add-items', {
        items: generatedItems,
      });

      const message = response.data.failed > 0
        ? `Added ${response.data.added} item(s) to Grocy (${response.data.failed} failed)`
        : `Added ${response.data.added} item(s) to Grocy shopping list`;

      setSuccessMessage(message);
      setGeneratedItems([]); // Clear generated items after adding

      // Refresh the current shopping list
      await fetchShoppingList();
    } catch {
      setError('Failed to add items to Grocy');
    } finally {
      setAddingToGrocy(false);
    }
  };

  const handleAddMissingProducts = async () => {
    setAddingMissing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.post('/grocy/shopping-list/add-missing-products', {});
      setSuccessMessage('Added low-stock items to shopping list');
      // Refresh the current shopping list
      await fetchShoppingList();
    } catch {
      setError('Failed to add low-stock items');
    } finally {
      setAddingMissing(false);
    }
  };

  const getMealSectionLabel = (meal: MealPlanItem) => {
    // Use section_name if available, otherwise fall back to type
    if (meal.section_name) {
      return meal.section_name;
    }
    // Fallback for older data without section_name
    const types: Record<string, string> = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
    };
    return types[meal.type] || meal.type;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Group meals by day
  const mealsByDay =
    mealPlan?.meals.reduce(
      (acc, meal) => {
        if (!acc[meal.day]) {
          acc[meal.day] = [];
        }
        acc[meal.day].push(meal);
        return acc;
      },
      {} as Record<string, MealPlanItem[]>
    ) || {};

  // Sort days
  const sortedDays = Object.keys(mealsByDay).sort();

  // Filter out done items and sort by product name
  const pendingItems = shoppingList
    .filter((item) => !item.done)
    .sort((a, b) => {
      const nameA = a.product_name || a.note || '';
      const nameB = b.product_name || b.note || '';
      return nameA.localeCompare(nameB);
    });

  const doneItems = shoppingList
    .filter((item) => item.done)
    .sort((a, b) => {
      const nameA = a.product_name || a.note || '';
      const nameB = b.product_name || b.note || '';
      return nameA.localeCompare(nameB);
    });

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Shopping List
          </h1>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Week starting:
            </label>
            <input
              type="date"
              value={selectedWeekStart}
              onChange={(e) => setSelectedWeekStart(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          {formatDateHeader(weekDates.start)} - {formatDate(weekDates.end)}
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/50 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-200">
              {successMessage}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meal Plan Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Meals This Week
              </h2>
              <button
                onClick={handleGenerate}
                disabled={generating || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? 'Generating...' : 'Generate Shopping List'}
              </button>
            </div>

            {loading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            )}

            {!loading && sortedDays.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow">
                No meals planned for this week
              </div>
            )}

            {!loading && sortedDays.length > 0 && (
              <div className="space-y-4">
                {sortedDays.map((day) => (
                  <div
                    key={day}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {formatDate(day)}
                    </h3>
                    <div className="space-y-2">
                      {mealsByDay[day].map((meal) => {
                        const imageUrl = meal.recipe?.picture_url
                          ? `${API_BASE_URL}${meal.recipe.picture_url}?token=${localStorage.getItem('auth_token')}`
                          : null;

                        return (
                          <div
                            key={meal.id}
                            className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                          >
                            {imageUrl && (
                              <img
                                src={imageUrl}
                                alt={meal.recipe?.name || 'Recipe'}
                                className="w-12 h-12 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2">
                                {getMealSectionLabel(meal)}
                              </span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {meal.recipe?.name || meal.note || 'Unnamed meal'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shopping List Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {generatedItems.length > 0 ? 'Generated Shopping List' : 'Current Shopping List'}
              </h2>
              {generatedItems.length === 0 && (
                <button
                  onClick={handleAddMissingProducts}
                  disabled={addingMissing}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="Add products below their minimum stock level"
                >
                  {addingMissing ? 'Adding...' : 'Restock Low Items'}
                </button>
              )}
            </div>

            {/* Generated Items (from smart generation) */}
            {generatedItems.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Items to Buy ({generatedItems.length})
                  </h3>
                  <button
                    onClick={handleAddToGrocy}
                    disabled={addingToGrocy}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {addingToGrocy ? 'Adding...' : 'Add to Grocy'}
                  </button>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {generatedItems.map((item) => (
                    <li
                      key={item.product_id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-900 dark:text-white">
                          {item.product_name}
                        </span>
                        {item.stock_amount > 0 && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            (need {item.needed_amount.toFixed(1)}, have {item.stock_amount.toFixed(1)})
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                        {item.to_buy_amount.toFixed(1)} {item.qu_name || ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {generatedItems.length === 0 && shoppingList.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow">
                Shopping list is empty. Click "Generate Shopping List" to calculate items from your meal plan.
              </div>
            )}

            {generatedItems.length === 0 && pendingItems.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    To Buy ({pendingItems.length})
                  </h3>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingItems.map((item) => (
                    <li
                      key={item.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex-shrink-0" />
                        <span className="text-gray-900 dark:text-white">
                          {item.product_name || item.note || 'Unknown item'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {item.amount} {item.qu_name || ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {generatedItems.length === 0 && doneItems.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow opacity-60">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Done ({doneItems.length})
                  </h3>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {doneItems.map((item) => (
                    <li
                      key={item.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded flex-shrink-0 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 line-through">
                          {item.product_name || item.note || 'Unknown item'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {item.amount} {item.qu_name || ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
