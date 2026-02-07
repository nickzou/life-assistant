/**
 * Utility functions for mapping ClickUp tasks to internal formats
 */

import { TIME_OF_DAY_FIELD_NAME } from '../constants';

export interface TaskItem {
  id: string;
  name: string;
  parentName: string | null;
  listId: string;
  status: {
    status: string;
    type: string;
    color: string;
  };
  startDate: string | null;
  hasStartTime: boolean;
  dueDate: string | null;
  hasDueTime: boolean;
  tags: string[];
  timeOfDay: {
    name: string;
    color: string;
  } | null;
  url: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  parent?: string;
  list?: { id: string };
  status?: {
    status?: string;
    type?: string;
    color?: string;
  };
  start_date?: string;
  start_date_time?: boolean;
  due_date?: string;
  due_date_time?: boolean;
  tags?: Array<{ name: string }>;
  custom_fields?: Array<{
    name?: string;
    value?: number;
    type_config?: {
      options?: Array<{
        orderindex: number;
        name: string;
        color: string;
      }>;
    };
  }>;
  url: string;
}

/**
 * Extract Time of Day custom field from a ClickUp task
 */
export function extractTimeOfDay(
  task: ClickUpTask,
): { name: string; color: string } | null {
  const timeOfDayField = task.custom_fields?.find(
    (field) => field.name?.toLowerCase() === TIME_OF_DAY_FIELD_NAME,
  );

  if (
    timeOfDayField?.value !== undefined &&
    timeOfDayField.type_config?.options
  ) {
    const selectedOption = timeOfDayField.type_config.options.find(
      (opt) => opt.orderindex === timeOfDayField.value,
    );
    if (selectedOption) {
      return {
        name: selectedOption.name,
        color: selectedOption.color,
      };
    }
  }

  return null;
}

/**
 * Map a ClickUp task to our internal TaskItem format
 */
export function mapTaskToItem(
  task: ClickUpTask,
  parentNames: Map<string, string> = new Map(),
): TaskItem {
  return {
    id: task.id,
    name: task.name,
    parentName: task.parent ? parentNames.get(task.parent) || null : null,
    listId: task.list?.id || '',
    status: {
      status: task.status?.status || 'unknown',
      type: task.status?.type || 'unknown',
      color: task.status?.color || '#gray',
    },
    startDate: task.start_date
      ? new Date(parseInt(task.start_date, 10)).toISOString()
      : null,
    hasStartTime: task.start_date_time === true,
    dueDate: task.due_date
      ? new Date(parseInt(task.due_date, 10)).toISOString()
      : null,
    hasDueTime: task.due_date_time === true,
    tags: task.tags?.map((tag) => tag.name) || [],
    timeOfDay: extractTimeOfDay(task),
    url: task.url,
  };
}
