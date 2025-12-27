/**
 * TypeScript type definitions for ClickUp API v2 responses
 * API Documentation: https://clickup.com/api
 */

export interface ClickUpUser {
  id: number;
  username: string;
  color: string;
  email: string;
  profilePicture: string | null;
  initials?: string;
}

export interface ClickUpStatus {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: 'open' | 'custom' | 'done' | 'closed';
}

export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config: Record<string, any>;
  date_created: string;
  hide_from_guests: boolean;
  value?: any;
  required: boolean;
}

export interface ClickUpList {
  id: string;
  name: string;
  access: boolean;
}

export interface ClickUpProject {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}

export interface ClickUpSpace {
  id: string;
  name?: string;
  access?: boolean;
}

export interface ClickUpSharing {
  public: boolean;
  public_share_expires_on: string | null;
  public_fields: string[];
  token: string | null;
  seo_optimized: boolean;
}

export interface ClickUpTask {
  id: string;
  custom_id: string | null;
  custom_item_id: number;
  name: string;
  text_content: string;
  description: string;
  status: ClickUpStatus;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  date_done: string | null;
  archived: boolean;
  creator: ClickUpUser;
  assignees: ClickUpUser[];
  group_assignees: any[];
  watchers: ClickUpUser[];
  checklists: any[];
  tags: any[];
  parent: string | null;
  top_level_parent: string | null;
  priority: ClickUpPriority | null;
  due_date: string | null;
  start_date: string | null;
  points: number | null;
  time_estimate: number | null;
  time_spent: number;
  custom_fields: ClickUpCustomField[];
  dependencies: any[];
  linked_tasks: any[];
  locations: any[];
  team_id: string;
  url: string;
  sharing: ClickUpSharing;
  permission_level: string;
  list: ClickUpList;
  project: ClickUpProject;
  folder: ClickUpFolder;
  space: ClickUpSpace;
}

export interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}

export interface ClickUpSpaceDetailed {
  id: string;
  name: string;
  private: boolean;
  statuses: ClickUpStatus[];
  multiple_assignees: boolean;
  features: {
    due_dates: {
      enabled: boolean;
      start_date: boolean;
      remap_due_dates: boolean;
      remap_closed_due_date: boolean;
    };
    sprints: {
      enabled: boolean;
    };
    time_tracking: {
      enabled: boolean;
      harvest: boolean;
      rollup: boolean;
    };
    points: {
      enabled: boolean;
    };
    custom_items: {
      enabled: boolean;
    };
    priorities: {
      enabled: boolean;
      priorities: ClickUpPriority[];
    };
    tags: {
      enabled: boolean;
    };
    check_unresolved: {
      enabled: boolean;
    };
    zoom: {
      enabled: boolean;
    };
    milestones: {
      enabled: boolean;
    };
    custom_fields: {
      enabled: boolean;
    };
    dependency_warning: {
      enabled: boolean;
    };
    status_pies: {
      enabled: boolean;
    };
    multiple_assignees: {
      enabled: boolean;
    };
  };
  archived: boolean;
}

export interface ClickUpSpacesResponse {
  spaces: ClickUpSpaceDetailed[];
}

export interface ClickUpListDetailed {
  id: string;
  name: string;
  orderindex: number;
  status: {
    status: string;
    color: string;
    hide_label: boolean;
  } | null;
  priority: ClickUpPriority | null;
  assignee: ClickUpUser | null;
  task_count: number;
  due_date: string | null;
  start_date: string | null;
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
    name: string;
    access: boolean;
  };
  archived: boolean;
  override_statuses: boolean;
  statuses: ClickUpStatus[];
  permission_level: string;
}

export interface ClickUpListsResponse {
  lists: ClickUpListDetailed[];
}
