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

import type { Project } from "@repo/shared";
