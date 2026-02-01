import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';

interface RecipeSelectionItem {
  id: number;
  name: string;
}

interface RecipePrepConfig {
  id?: number;
  grocy_recipe_id: number;
  requires_defrost: boolean;
  defrost_item: string | null;
}

interface RecipePrepSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecipePrepSettings({ isOpen, onClose }: RecipePrepSettingsProps) {
  const [recipes, setRecipes] = useState<RecipeSelectionItem[]>([]);
  const [prepConfigs, setPrepConfigs] = useState<Map<number, RecipePrepConfig>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRecipeId, setSavingRecipeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local edits state - maps recipe ID to edited values
  const [localEdits, setLocalEdits] = useState<Map<number, Partial<RecipePrepConfig>>>(new Map());

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recipesRes, configsRes] = await Promise.all([
        api.get<RecipeSelectionItem[]>('/grocy/recipes/selection'),
        api.get<RecipePrepConfig[]>('/grocy/prep-configs'),
      ]);

      setRecipes(recipesRes.data.sort((a, b) => a.name.localeCompare(b.name)));

      // Build map of prep configs by recipe ID
      const configMap = new Map<number, RecipePrepConfig>();
      configsRes.data.forEach((config) => {
        configMap.set(config.grocy_recipe_id, config);
      });
      setPrepConfigs(configMap);
      setLocalEdits(new Map());
    } catch {
      setError('Failed to load recipe settings');
    } finally {
      setLoading(false);
    }
  };

  // Filter recipes by search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) {
      // When no search, show only recipes with existing prep configs
      return recipes.filter((r) => prepConfigs.has(r.id));
    }
    return recipes.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recipes, searchQuery, prepConfigs]);

  const getEffectiveConfig = (recipeId: number): RecipePrepConfig => {
    const saved = prepConfigs.get(recipeId);
    const local = localEdits.get(recipeId);

    return {
      grocy_recipe_id: recipeId,
      requires_defrost: local?.requires_defrost ?? saved?.requires_defrost ?? false,
      defrost_item: local?.defrost_item ?? saved?.defrost_item ?? null,
    };
  };

  const updateLocalEdit = (recipeId: number, updates: Partial<RecipePrepConfig>) => {
    setLocalEdits((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(recipeId) || {};
      newMap.set(recipeId, { ...existing, ...updates });
      return newMap;
    });
  };

  const hasUnsavedChanges = (recipeId: number): boolean => {
    const local = localEdits.get(recipeId);
    if (!local) return false;

    const saved = prepConfigs.get(recipeId);
    const effective = getEffectiveConfig(recipeId);

    // If there's no saved config, any local edit is a change
    if (!saved) {
      return effective.requires_defrost || !!effective.defrost_item;
    }

    // Compare local changes to saved values
    return (
      (local.requires_defrost !== undefined && local.requires_defrost !== saved.requires_defrost) ||
      (local.defrost_item !== undefined && local.defrost_item !== saved.defrost_item)
    );
  };

  const handleSave = async (recipeId: number) => {
    const config = getEffectiveConfig(recipeId);

    setSavingRecipeId(recipeId);
    setError(null);
    try {
      const response = await api.put<RecipePrepConfig>(
        `/grocy/recipes/${recipeId}/prep-config`,
        {
          requires_defrost: config.requires_defrost,
          defrost_item: config.defrost_item,
        }
      );

      // Update saved config
      setPrepConfigs((prev) => {
        const newMap = new Map(prev);
        newMap.set(recipeId, response.data);
        return newMap;
      });

      // Clear local edits for this recipe
      setLocalEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(recipeId);
        return newMap;
      });
    } catch {
      setError('Failed to save settings');
    } finally {
      setSavingRecipeId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recipe Prep Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="Search recipes to configure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          {!searchQuery.trim() && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Showing recipes with existing prep settings. Search to find more recipes.
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/50 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No recipes found' : 'No recipes configured yet. Search to add one.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecipes.map((recipe) => {
                const config = getEffectiveConfig(recipe.id);
                const hasChanges = hasUnsavedChanges(recipe.id);
                const isSaving = savingRecipeId === recipe.id;

                return (
                  <div
                    key={recipe.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-3">
                      {recipe.name}
                    </div>

                    <div className="space-y-3">
                      {/* Requires defrost checkbox */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`defrost-${recipe.id}`}
                          checked={config.requires_defrost}
                          onChange={(e) =>
                            updateLocalEdit(recipe.id, { requires_defrost: e.target.checked })
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <label
                          htmlFor={`defrost-${recipe.id}`}
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          Requires defrost
                        </label>
                      </div>

                      {/* Defrost details (shown when defrost is required) */}
                      {config.requires_defrost && (
                        <div className="ml-6">
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Item to defrost
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., chicken thighs"
                            value={config.defrost_item || ''}
                            onChange={(e) =>
                              updateLocalEdit(recipe.id, { defrost_item: e.target.value || null })
                            }
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Save button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleSave(recipe.id)}
                        disabled={!hasChanges || isSaving}
                        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
