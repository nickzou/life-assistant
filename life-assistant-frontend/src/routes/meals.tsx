import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { MealCard } from '../components/MealCard';
import { RecipePrepSettings } from '../components/RecipePrepSettings';
import type { MealPlanItem } from '../components/MealCard';
import { api } from '../lib/api';
import {
  getStartOfWeek,
  getWeekDates,
  formatWeekRange,
  formatDateString,
} from '../lib/date.utils';

interface MealPlanSection {
  id: number;
  name: string | null;
  sort_number: number;
}

interface RecipeSelectionItem {
  id: number;
  name: string;
  picture_url?: string;
  base_servings: number;
}

interface MealPlanRangeResponse {
  startDate: string;
  endDate: string;
  meals: MealPlanItem[];
}

// localStorage key for done meals
const DONE_MEALS_KEY = 'life-assistant:done-meals';

// Helper functions for localStorage done meals tracking
function loadDoneMeals(): Map<number, number> {
  try {
    const stored = localStorage.getItem(DONE_MEALS_KEY);
    if (!stored) return new Map();
    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed).map(([k, v]) => [parseInt(k, 10), v as number]));
  } catch {
    return new Map();
  }
}

function saveDoneMeals(doneMeals: Map<number, number>): void {
  const obj: Record<string, number> = {};
  doneMeals.forEach((timestamp, mealId) => {
    obj[mealId.toString()] = timestamp;
  });
  localStorage.setItem(DONE_MEALS_KEY, JSON.stringify(obj));
}

function cleanupOldDoneMeals(doneMeals: Map<number, number>): Map<number, number> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cleaned = new Map<number, number>();
  doneMeals.forEach((timestamp, mealId) => {
    if (timestamp > thirtyDaysAgo) {
      cleaned.set(mealId, timestamp);
    }
  });
  return cleaned;
}

export const Route = createFileRoute('/meals')({
  component: MealsPage,
});

function MealsPage() {
  // Week navigation state
  const [weekStartDate, setWeekStartDate] = useState(() => getStartOfWeek(new Date()));
  const weekDates = useMemo(() => getWeekDates(weekStartDate), [weekStartDate]);

  // Data state
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
  const [sections, setSections] = useState<MealPlanSection[]>([]);
  const [recipes, setRecipes] = useState<RecipeSelectionItem[]>([]);
  const [doneMeals, setDoneMeals] = useState<Set<number>>(() => {
    const loaded = loadDoneMeals();
    const cleaned = cleanupOldDoneMeals(loaded);
    if (cleaned.size !== loaded.size) {
      saveDoneMeals(cleaned);
    }
    return new Set(cleaned.keys());
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string | null>(null);
  const [addingMeal, setAddingMeal] = useState(false);

  // Add meal form state
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [mealServings, setMealServings] = useState<number>(1);
  const [createClickUpTasks, setCreateClickUpTasks] = useState<boolean>(true);

  // Delete confirmation state
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null);

  // Edit modal state
  const [editingMeal, setEditingMeal] = useState<MealPlanItem | null>(null);
  const [editSectionId, setEditSectionId] = useState<number | null>(null);
  const [editServings, setEditServings] = useState<number>(1);
  const [isEditing, setIsEditing] = useState(false);

  // Consume confirmation state
  const [consumingMeal, setConsumingMeal] = useState<MealPlanItem | null>(null);
  const [isConsuming, setIsConsuming] = useState(false);

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchMealPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = formatDateString(weekStartDate);
      // Calculate end date directly to avoid dependency on weekDates
      const endDateObj = new Date(weekStartDate);
      endDateObj.setDate(endDateObj.getDate() + 6);
      const endDate = formatDateString(endDateObj);
      const response = await api.get<MealPlanRangeResponse>(
        `/grocy/meal-plan/range/${startDate}/${endDate}`
      );
      setMealPlan(response.data.meals);
    } catch {
      setError('Failed to fetch meal plan');
    } finally {
      setLoading(false);
    }
  }, [weekStartDate]);

  const fetchRecipes = async () => {
    try {
      const response = await api.get<RecipeSelectionItem[]>('/grocy/recipes/selection');
      setRecipes(response.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      console.error('Failed to fetch recipes');
    }
  };

  const fetchSections = async () => {
    try {
      const response = await api.get<MealPlanSection[]>('/grocy/meal-plan/sections');
      // Filter out internal Grocy sections (negative IDs)
      const realSections = response.data.filter((s) => s.id > 0);
      setSections(realSections.sort((a, b) => a.sort_number - b.sort_number));
    } catch {
      console.error('Failed to fetch sections');
    }
  };

  useEffect(() => {
    fetchMealPlan();
    fetchRecipes();
    fetchSections();
  }, [fetchMealPlan]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setWeekStartDate(newDate);
  };

  const goToToday = () => {
    setWeekStartDate(getStartOfWeek(new Date()));
  };

  const openAddModal = (date: string) => {
    setSelectedDateForAdd(date);
    setSelectedRecipeId(null);
    setSelectedSectionId(sections.length > 0 ? sections[0].id : null);
    setMealServings(1);
    setCreateClickUpTasks(true);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedDateForAdd(null);
  };

  const handleAddMeal = async () => {
    if (!selectedDateForAdd || !selectedRecipeId) return;

    const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
    const recipeName = selectedRecipe?.name || `Recipe ${selectedRecipeId}`;
    const selectedSection = sections.find((s) => s.id === selectedSectionId);
    const sectionName = selectedSection?.name || undefined;

    setAddingMeal(true);
    setError(null);
    try {
      await api.post('/grocy/meal-plan', {
        day: selectedDateForAdd,
        recipe_id: selectedRecipeId,
        section_id: selectedSectionId,
        servings: mealServings,
        createClickUpTasks,
        recipeName,
        sectionName,
      });
      const taskMessage = createClickUpTasks ? ' with ClickUp tasks' : '';
      setSuccessMessage(`Meal added successfully${taskMessage}`);
      closeAddModal();
      await fetchMealPlan();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to add meal');
    } finally {
      setAddingMeal(false);
    }
  };

  const handleDeleteMeal = async (mealId: number) => {
    setError(null);
    try {
      await api.delete(`/grocy/meal-plan/${mealId}`);
      setMealPlan((prev) => prev.filter((m) => m.id !== mealId));
      // Also remove from done meals if present
      setDoneMeals((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mealId);
        const doneMealsMap = loadDoneMeals();
        doneMealsMap.delete(mealId);
        saveDoneMeals(doneMealsMap);
        return newSet;
      });
      setSuccessMessage('Meal removed');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to delete meal');
    } finally {
      setDeletingMealId(null);
    }
  };

  const handleConsumeMeal = async (meal: MealPlanItem) => {
    if (!meal.recipe_id) return;

    setIsConsuming(true);
    setError(null);
    try {
      await api.post(`/grocy/recipes/${meal.recipe_id}/consume`, {
        servings: meal.recipe_servings || 1,
      });
      // Mark as done after successful consumption
      markMealDone(meal.id);
      setSuccessMessage('Recipe consumed - ingredients deducted from stock');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message = axiosError?.response?.data?.message || 'Failed to consume recipe - ingredients may not be in stock';
      setError(message);
    } finally {
      setIsConsuming(false);
      setConsumingMeal(null);
    }
  };

  const markMealDone = (mealId: number) => {
    setDoneMeals((prev) => {
      const newSet = new Set(prev);
      newSet.add(mealId);
      const doneMealsMap = loadDoneMeals();
      doneMealsMap.set(mealId, Date.now());
      saveDoneMeals(doneMealsMap);
      return newSet;
    });
  };

  const unmarkMealDone = (mealId: number) => {
    setDoneMeals((prev) => {
      const newSet = new Set(prev);
      newSet.delete(mealId);
      const doneMealsMap = loadDoneMeals();
      doneMealsMap.delete(mealId);
      saveDoneMeals(doneMealsMap);
      return newSet;
    });
  };

  const openEditModal = (meal: MealPlanItem) => {
    setEditingMeal(meal);
    setEditSectionId(meal.section_id ?? null);
    setEditServings(meal.recipe_servings || 1);
  };

  const closeEditModal = () => {
    setEditingMeal(null);
  };

  const handleEditMeal = async () => {
    if (!editingMeal) return;

    setIsEditing(true);
    setError(null);
    try {
      const newSection = sections.find((s) => s.id === editSectionId);

      await api.patch(`/grocy/meal-plan/${editingMeal.id}`, {
        section_id: editSectionId,
        sectionName: newSection?.name,
        servings: editServings,
        oldSectionName: editingMeal.section_name,
      });

      setSuccessMessage('Meal updated successfully');
      closeEditModal();
      await fetchMealPlan();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to update meal');
    } finally {
      setIsEditing(false);
    }
  };

  const formatDayHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = formatDateString(new Date());
    const isToday = dateStr === today;

    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      monthName: date.toLocaleDateString('en-US', { month: 'short' }),
      isToday,
    };
  };

  // Group meals by day and sort by section (Breakfast, Lunch, Dinner)
  const sectionOrder: Record<string, number> = {
    breakfast: 1,
    lunch: 2,
    dinner: 3,
  };
  const mealsByDay: Record<string, MealPlanItem[]> = {};
  weekDates.forEach((date) => {
    mealsByDay[date] = mealPlan
      .filter((meal) => meal.day === date)
      .sort((a, b) => {
        const aOrder = sectionOrder[(a.section_name || '').toLowerCase()] || 99;
        const bOrder = sectionOrder[(b.section_name || '').toLowerCase()] || 99;
        return aOrder - bOrder;
      });
  });

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with week navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Meal Plan
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Previous week"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Next week"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Recipe prep settings"
              title="Recipe prep settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Week range display */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          {formatWeekRange(weekStartDate)}
        </p>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/50 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        )}

        {/* Weekly view */}
        {!loading && (
          <div className="flex flex-col lg:grid lg:grid-cols-7 gap-4">
            {weekDates.map((date) => {
              const dayInfo = formatDayHeader(date);
              const dayMeals = mealsByDay[date] || [];

              return (
                <div
                  key={date}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 min-h-[200px] ${
                    dayInfo.isToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Day header */}
                  <div className={`text-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 ${
                    dayInfo.isToday ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {dayInfo.dayName}
                    </div>
                    <div className={`text-lg font-bold ${
                      dayInfo.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {dayInfo.dayNumber}
                    </div>
                  </div>

                  {/* Meals for this day */}
                  <div className="space-y-2">
                    {dayMeals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        layout="stacked"
                        isDone={meal.done === 1 || doneMeals.has(meal.id)}
                        onConsume={() => setConsumingMeal(meal)}
                        onMarkDone={() => markMealDone(meal.id)}
                        onUnmarkDone={() => unmarkMealDone(meal.id)}
                        onDelete={() => setDeletingMealId(meal.id)}
                        onEdit={() => openEditModal(meal)}
                      />
                    ))}
                  </div>

                  {/* Add meal button */}
                  <button
                    onClick={() => openAddModal(date)}
                    className="w-full mt-2 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm">Add</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Meal Modal */}
        {isAddModalOpen && selectedDateForAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Add Meal - {new Date(selectedDateForAdd + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </h2>

              <div className="space-y-4">
                {/* Recipe select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipe
                  </label>
                  <select
                    value={selectedRecipeId || ''}
                    onChange={(e) => {
                      const recipeId = parseInt(e.target.value, 10);
                      setSelectedRecipeId(recipeId || null);
                      // Set default servings from recipe
                      const recipe = recipes.find((r) => r.id === recipeId);
                      if (recipe) {
                        setMealServings(recipe.base_servings);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a recipe...</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section select */}
                {sections.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meal Type
                    </label>
                    <select
                      value={selectedSectionId || ''}
                      onChange={(e) => setSelectedSectionId(parseInt(e.target.value, 10) || null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">None</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name || `Section ${section.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Servings input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Servings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={mealServings}
                    onChange={(e) => setMealServings(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* ClickUp tasks checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createClickUpTasks"
                    checked={createClickUpTasks}
                    onChange={(e) => setCreateClickUpTasks(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label
                    htmlFor="createClickUpTasks"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Create prep tasks in ClickUp
                  </label>
                </div>
              </div>

              {/* Modal buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMeal}
                  disabled={!selectedRecipeId || addingMeal}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingMeal ? 'Adding...' : 'Add Meal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingMealId !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Remove Meal?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                This will remove the meal from your plan.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                Associated ClickUp tasks will also be deleted (completed tasks will be kept).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingMealId(null)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMeal(deletingMealId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Consume Confirmation Modal */}
        {consumingMeal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Consume Recipe?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This will deduct ingredients from your Grocy stock for "{consumingMeal.recipe?.name || 'this recipe'}" ({consumingMeal.recipe_servings || 1} serving{(consumingMeal.recipe_servings || 1) !== 1 ? 's' : ''}).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConsumingMeal(null)}
                  disabled={isConsuming}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConsumeMeal(consumingMeal)}
                  disabled={isConsuming}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConsuming ? 'Consuming...' : 'Consume'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Meal Modal */}
        {editingMeal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Edit Meal - {editingMeal.recipe?.name || 'Unknown'}
              </h2>

              <div className="space-y-4">
                {/* Section select */}
                {sections.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meal Type
                    </label>
                    <select
                      value={editSectionId || ''}
                      onChange={(e) => setEditSectionId(parseInt(e.target.value, 10) || null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">None</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name || `Section ${section.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Servings input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Servings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editServings}
                    onChange={(e) => setEditServings(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Modal buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeEditModal}
                  disabled={isEditing}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditMeal}
                  disabled={isEditing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Prep Settings Modal */}
        <RecipePrepSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
