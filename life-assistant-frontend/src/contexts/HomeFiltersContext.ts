import { createContext, useContext } from 'react';

export type TaskFilter = 'all' | 'work' | 'personal';

export interface HomeFiltersContextType {
  filter: TaskFilter;
  showDone: boolean;
  setFilter: (filter: TaskFilter) => void;
  setShowDone: (showDone: boolean) => void;
}

export const HomeFiltersContext = createContext<HomeFiltersContextType | undefined>(undefined);

export function useHomeFilters() {
  const context = useContext(HomeFiltersContext);
  if (!context) {
    throw new Error('useHomeFilters must be used within a HomeFiltersProvider');
  }
  return context;
}
