export type ProjectTheme =
  | "#6366f1"
  | "#10b981"
  | "#e11d48"
  | "#f59e0b"
  | "#a855f7"
  | "#0ea5e9";

export type WorkspaceProject = Omit<Project, "color"> & {
  color: ProjectTheme;
};

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export type Sprint = {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
};
import type { Project } from "@repo/shared";
