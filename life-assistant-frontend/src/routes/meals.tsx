import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { api, API_BASE_URL } from '../lib/api';

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
}

interface MealPlanResponse {
  date: string;
  meals: MealPlanItem[];
}

export const Route = createFileRoute('/meals')({
  component: MealsPage,
});

function MealsPage() {
  const [data, setData] = useState<MealPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchMealPlan = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = date === new Date().toISOString().split('T')[0]
        ? '/grocy/meal-plan/today'
        : `/grocy/meal-plan/date/${date}`;
      const response = await api.get<MealPlanResponse>(endpoint);
      setData(response.data);
    } catch {
      setError('Failed to fetch meal plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealPlan(selectedDate);
  }, [selectedDate]);

  const getMealTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
    };
    return types[type] || type;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Meal Plan
          </h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          {formatDate(selectedDate)}
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {data.meals.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow">
                No meals planned for this day
              </div>
            ) : (
              data.meals.map((meal) => {
                const imageUrl = meal.recipe?.picture_url
                  ? `${API_BASE_URL}${meal.recipe.picture_url}?token=${localStorage.getItem('auth_token')}`
                  : null;

                return (
                  <div
                    key={meal.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                  >
                    <div className="flex items-start gap-4">
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={meal.recipe?.name || 'Recipe'}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                          onError={(e) => {
                            // Hide image if it fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mb-2">
                          {getMealTypeLabel(meal.type)}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {meal.recipe?.name || meal.note || 'Unnamed meal'}
                        </h3>
                        {meal.recipe?.description && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {meal.recipe.description}
                          </p>
                        )}
                        {meal.servings && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                            Servings: {meal.servings}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
