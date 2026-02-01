import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { MealCard } from '../components/MealCard';
import type { MealPlanItem } from '../components/MealCard';
import { api } from '../lib/api';
import { formatDateString } from '../lib/date.utils';

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

  const handleToggleItemDone = async (itemId: number, currentDone: boolean) => {
    try {
      await api.patch(`/grocy/shopping-list/items/${itemId}`, {
        done: !currentDone,
      });
      // Update local state immediately for responsiveness
      setShoppingList((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, done: !currentDone } : item
        )
      );
    } catch {
      setError('Failed to update item');
    }
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

        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-6">
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
                      {mealsByDay[day].map((meal) => (
                        <MealCard key={meal.id} meal={meal} />
                      ))}
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
                Shopping List
              </h2>
              <button
                onClick={handleAddMissingProducts}
                disabled={addingMissing}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                title="Add products below their minimum stock level"
              >
                {addingMissing ? 'Adding...' : 'Restock Low Items'}
              </button>
            </div>

            {/* Generated Items (from smart generation) */}
            {generatedItems.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow mb-4">
                <div className="p-4 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    From Meal Plan ({generatedItems.length})
                  </h3>
                  <button
                    onClick={handleAddToGrocy}
                    disabled={addingToGrocy}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {addingToGrocy ? 'Adding...' : 'Add to Grocy'}
                  </button>
                </div>
                <ul className="divide-y divide-blue-200 dark:divide-blue-800">
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

            {pendingItems.length > 0 && (
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
                        <button
                          onClick={() => handleToggleItemDone(item.id, item.done)}
                          className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex-shrink-0 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          aria-label="Mark as done"
                        />
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

            {doneItems.length > 0 && (
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
                        <button
                          onClick={() => handleToggleItemDone(item.id, item.done)}
                          className="w-5 h-5 bg-green-500 rounded flex-shrink-0 flex items-center justify-center hover:bg-green-600 transition-colors"
                          aria-label="Mark as not done"
                        >
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
                        </button>
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
