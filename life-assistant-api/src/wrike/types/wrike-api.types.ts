/**
 * Wrike API Response Types
 * Based on actual API responses from Wrike API v4
 */

export interface WrikeApiResponse<T> {
  kind: string;
  data: T[];
}

export interface WrikeTask {
  id: string;
  accountId: string;
  title: string;
  status: 'Active' | 'Completed' | 'Deferred' | 'Cancelled';
  importance: 'High' | 'Normal' | 'Low';
  createdDate: string;
  updatedDate: string;
  dates: {
    type: string;
    duration?: number;
    start?: string;
    due?: string;
  };
  scope: string;
  customStatusId: string;
  permalink: string;
  priority: string;
  description?: string;
  briefDescription?: string;
  parentIds?: string[];
  superParentIds?: string[];
  sharedIds?: string[];
  responsibleIds?: string[];
  followers?: string[];
  customFields?: Array<{
    id: string;
    value: string;
  }>;
}

export interface WrikeCustomStatus {
  id: string;
  name: string;
  standardName: boolean;
  standard: boolean;
  color: string;
  group: 'Active' | 'Completed' | 'Deferred' | 'Cancelled';
  hidden: boolean;
}

export interface WrikeWorkflow {
  id: string;
  name: string;
  standard: boolean;
  hidden: boolean;
  customStatuses: WrikeCustomStatus[];
  description?: string;
}

export interface WrikeFolder {
  id: string;
  title: string;
  childIds: string[];
  scope: string;
  project?: {
    authorId: string;
    ownerIds: string[];
    status: string;
    startDate?: string;
    endDate?: string;
    createdDate: string;
    completedDate?: string;
  };
}

export interface WrikeTasksResponse extends WrikeApiResponse<WrikeTask> {
  kind: 'tasks';
}

export interface WrikeWorkflowsResponse extends WrikeApiResponse<WrikeWorkflow> {
  kind: 'workflows';
}

export interface WrikeFoldersResponse {
  kind: 'folderTree';
  data: WrikeFolder[];
}
