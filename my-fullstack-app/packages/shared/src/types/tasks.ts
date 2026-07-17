import type { ColumnCategory } from "./dashboard";

export const TASK_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface KanbanAssignee {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface KanbanTask {
  id: string;
  code: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  storyPoints: number | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  sprintId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: KanbanAssignee | null;
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  color: string;
  category: ColumnCategory;
  boardId: string;
  tasks: KanbanTask[];
}

export interface KanbanBoard {
  id: string;
  title: string;
  projectId: string;
  columns: KanbanColumn[];
}

export interface CreateKanbanColumnInput {
  title: string;
  color?: string;
  category?: ColumnCategory;
}

export interface UpdateKanbanColumnInput {
  title?: string;
  color?: string;
  category?: ColumnCategory;
  order?: number;
}

export interface CreateKanbanTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  storyPoints?: number | null;
  columnId: string;
  assigneeId?: string | null;
  sprintId?: string | null;
}

export type UpdateKanbanTaskInput = Partial<
  Omit<CreateKanbanTaskInput, "columnId">
>;

export interface MoveKanbanTaskInput {
  columnId: string;
  order?: number;
}
