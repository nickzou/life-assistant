import { API_BASE_URL } from '../lib/api';

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
  recipe_servings?: number;
  section_id?: number;
  section_name?: string | null;
  done?: number; // 0 or 1 from Grocy
}

interface MealCardProps {
  meal: MealPlanItem;
  isDone?: boolean;
  layout?: 'horizontal' | 'stacked';
  onConsume?: () => void;
  onMarkDone?: () => void;
  onUnmarkDone?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

function getMealSectionLabel(meal: MealPlanItem): string {
  if (meal.section_name) return meal.section_name;
  const types: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };
  return types[meal.type] || meal.type;
}

function getMealSectionColor(meal: MealPlanItem): string {
  const section = (meal.section_name || meal.type || '').toLowerCase();
  const colors: Record<string, string> = {
    breakfast: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    lunch: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    dinner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'meal prep': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
    snack: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  };
  return colors[section] || 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
}

export function MealCard({
  meal,
  isDone = false,
  layout = 'horizontal',
  onConsume,
  onMarkDone,
  onUnmarkDone,
  onDelete,
  onEdit,
}: MealCardProps) {
  const imageUrl = meal.recipe?.picture_url
    ? `${API_BASE_URL}${meal.recipe.picture_url}?token=${localStorage.getItem('auth_token')}`
    : null;

  const hasActions = onConsume || onMarkDone || onUnmarkDone || onDelete || onEdit;
  const hasCompletionActions = onConsume || onMarkDone;
  const isStacked = layout === 'stacked';

  return (
    <div
      className={`@container relative rounded-md p-2 transition-opacity ${
        isDone ? 'opacity-60 bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700'
      }`}
    >
      {/* Done checkmark overlay */}
      {isDone && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center z-10">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Section badge */}
      <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded ${getMealSectionColor(meal)} mb-1`}>
        {getMealSectionLabel(meal)}
      </span>

      {/* Recipe image and name - stacked layout */}
      {isStacked ? (
        <div className="flex flex-col">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={meal.recipe?.name || 'Recipe'}
              className="w-full aspect-video object-cover rounded mb-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <p className={`text-sm font-medium text-gray-900 dark:text-white ${
            isDone ? 'line-through' : ''
          }`}>
            {meal.recipe?.name || meal.note || 'Unnamed meal'}
          </p>
          {meal.recipe_servings && meal.recipe_servings !== 1 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {meal.recipe_servings} servings
            </p>
          )}
        </div>
      ) : (
        /* Recipe image and name - horizontal layout */
        <div className="flex items-start gap-2">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={meal.recipe?.name || 'Recipe'}
              className="w-10 h-10 object-cover rounded flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
              isDone ? 'line-through' : ''
            }`}>
              {meal.recipe?.name || meal.note || 'Unnamed meal'}
            </p>
            {meal.recipe_servings && meal.recipe_servings !== 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {meal.recipe_servings} servings
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action buttons - only render if at least one action is provided */}
      {hasActions && (
        <div className="flex flex-col @[180px]:flex-row gap-1 mt-2">
          {!isDone && hasCompletionActions && (
            <div className="flex gap-1 flex-1">
              {onConsume && (
                <button
                  onClick={onConsume}
                  className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title="Consume (deduct ingredients from stock)"
                >
                  Consume
                </button>
              )}
              {onMarkDone && (
                <button
                  onClick={onMarkDone}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="Mark as done (visual only)"
                >
                  Done
                </button>
              )}
            </div>
          )}
          {isDone && onUnmarkDone && (
            <button
              onClick={onUnmarkDone}
              className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Undo
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="w-full @[180px]:w-auto p-1.5 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center justify-center"
              title="Edit meal"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-full @[180px]:w-auto p-1.5 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center justify-center"
              title="Remove from plan"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export type { MealPlanItem };
