export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintInput {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateSprintStatusInput {
  status: Extract<SprintStatus, "ACTIVE" | "COMPLETED">;
}
