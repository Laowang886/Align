import type { TaskPriority } from "./tasks";

export const COLUMN_CATEGORIES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const;
export type ColumnCategory = (typeof COLUMN_CATEGORIES)[number];

export interface DashboardMetrics {
  activeProjects: number;
  deliveredTasks: number;
  totalTasks: number;
  completionRate: number;
  completedStoryPoints: number;
  totalStoryPoints: number;
  unestimatedTasks: number;
}

export interface DashboardWorkloadItem {
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  done: number;
  remaining: number;
}

export interface DashboardStatusItem {
  category: ColumnCategory;
  count: number;
}

export interface DashboardDeadline {
  id: string;
  code: string;
  title: string;
  priority: TaskPriority;
  dueDate: string;
  projectId: string;
  projectName: string;
}

export interface DashboardActivity {
  id: string;
  actorName: string;
  actorAvatarUrl: string | null;
  action: string;
  summary: string;
  projectId: string | null;
  createdAt: string;
}

export interface DashboardActiveSprint {
  id: string;
  name: string;
  goal: string;
  projectId: string;
  projectName: string;
  endDate: string;
}

export interface WorkspaceDashboard {
  workspaceId: string;
  generatedAt: string;
  metrics: DashboardMetrics;
  activeSprint: DashboardActiveSprint | null;
  workload: DashboardWorkloadItem[];
  statusBreakdown: DashboardStatusItem[];
  deadlines: DashboardDeadline[];
  activities: DashboardActivity[];
}

export interface WeeklyReport {
  markdown: string;
  generatedAt: string;
  model: string;
}
