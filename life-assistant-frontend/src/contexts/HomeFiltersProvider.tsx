import { useState } from 'react';
import type { ReactNode } from 'react';
import { HomeFiltersContext, type TaskFilter } from './HomeFiltersContext';

export function HomeFiltersProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [showDone, setShowDone] = useState(true);

  return (
    <HomeFiltersContext.Provider
      value={{
        filter,
        showDone,
        setFilter,
        setShowDone,
      }}
    >
      {children}
    </HomeFiltersContext.Provider>
  );
}
