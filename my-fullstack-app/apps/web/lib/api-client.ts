import type {
  CreateWorkspaceInput,
  CreateProjectInput,
  CreateSprintInput,
  CreateWikiDocumentInput,
  Project,
  Sprint,
  UpdateSprintStatusInput,
  UpdateWikiDocumentInput,
  WikiDocument,
  WorkspaceDetails,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
  AuthResponse,
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
  WorkspaceDashboard,
  WeeklyReport,
  KanbanBoard,
  KanbanColumn,
  KanbanTask,
  CreateKanbanColumnInput,
  UpdateKanbanColumnInput,
  CreateKanbanTaskInput,
  UpdateKanbanTaskInput,
  MoveKanbanTaskInput,
  UpdateProfileInput,
} from "@repo/shared";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

export type OAuthProvider = "google" | "github";

export function getOAuthUrl(provider: OAuthProvider): string {
  return `${API_URL}/auth/${provider}`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function clearClientAuthState(): void {
  window.localStorage.removeItem("currentWorkspaceId");
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "Unable to connect to the API service.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const payload = await readJson(response);
    const message =
      extractErrorMessage(payload) ??
      `Request failed with status ${response.status}`;
    if (response.status === 401) {
      clearClientAuthState();
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => undefined);
      if (window.location.pathname !== "/login")
        window.location.assign("/login");
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload))
    return null;
  const message = (payload as Record<string, unknown>).message;
  if (typeof message === "string") return message;
  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    return message.join(", ");
  }
  return null;
}

export const workspaceApi = {
  list: () => apiRequest<WorkspaceSummary[]>("/workspaces"),
  get: (workspaceId: string) =>
    apiRequest<WorkspaceDetails>(`/workspaces/${workspaceId}`),
  create: (input: CreateWorkspaceInput) =>
    apiRequest<WorkspaceSummary>("/workspaces", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  members: (workspaceId: string) =>
    apiRequest<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
  inviteMember: (
    workspaceId: string,
    input: { email: string; role: Exclude<WorkspaceRole, "OWNER"> },
  ) =>
    apiRequest<WorkspaceMember>(`/workspaces/${workspaceId}/members/invite`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateMemberRole: (
    workspaceId: string,
    memberId: string,
    role: Exclude<WorkspaceRole, "OWNER">,
  ) =>
    apiRequest<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    ),
  removeMember: (workspaceId: string, memberId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    }),
  leave: (workspaceId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/leave`, { method: "POST" }),
  transferOwnership: (workspaceId: string, memberId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/transfer-ownership`, {
      method: "POST",
      body: JSON.stringify({ memberId }),
    }),
};

export const projectApi = {
  list: (workspaceId: string) =>
    apiRequest<Project[]>(`/workspaces/${workspaceId}/projects`),
  create: (workspaceId: string, input: CreateProjectInput) =>
    apiRequest<Project>(`/workspaces/${workspaceId}/projects`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

export const sprintApi = {
  list: (workspaceId: string, projectId: string) =>
    apiRequest<Sprint[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/sprints`,
    ),
  create: (workspaceId: string, projectId: string, input: CreateSprintInput) =>
    apiRequest<Sprint>(
      `/workspaces/${workspaceId}/projects/${projectId}/sprints`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  updateStatus: (
    workspaceId: string,
    projectId: string,
    sprintId: string,
    input: UpdateSprintStatusInput,
  ) =>
    apiRequest<Sprint>(
      `/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/status`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
};

export const dashboardApi = {
  get: (workspaceId: string) =>
    apiRequest<WorkspaceDashboard>(`/workspaces/${workspaceId}/dashboard`),
  generateWeeklyReport: (workspaceId: string) =>
    apiRequest<WeeklyReport>(`/workspaces/${workspaceId}/reports/weekly`, {
      method: "POST",
    }),
};

export const kanbanApi = {
  get: (workspaceId: string, projectId: string) =>
    apiRequest<KanbanBoard>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban`,
    ),
  createColumn: (
    workspaceId: string,
    projectId: string,
    input: CreateKanbanColumnInput,
  ) =>
    apiRequest<KanbanColumn>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban/columns`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateColumn: (
    workspaceId: string,
    projectId: string,
    columnId: string,
    input: UpdateKanbanColumnInput,
  ) =>
    apiRequest<KanbanColumn>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban/columns/${columnId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteColumn: (
    workspaceId: string,
    projectId: string,
    columnId: string,
    moveTasksToColumnId?: string,
  ) =>
    apiRequest<void>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban/columns/${columnId}`,
      {
        method: "DELETE",
        body: JSON.stringify(
          moveTasksToColumnId ? { moveTasksToColumnId } : {},
        ),
      },
    ),
  createTask: (
    workspaceId: string,
    projectId: string,
    input: CreateKanbanTaskInput,
  ) =>
    apiRequest<KanbanTask>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban/tasks`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  updateTask: (
    workspaceId: string,
    projectId: string,
    taskId: string,
    input: UpdateKanbanTaskInput,
  ) =>
    apiRequest<KanbanTask>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteTask: (workspaceId: string, projectId: string, taskId: string) =>
    apiRequest<void>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban/tasks/${taskId}`,
      { method: "DELETE" },
    ),
  moveTask: (
    workspaceId: string,
    projectId: string,
    taskId: string,
    input: MoveKanbanTaskInput,
  ) =>
    apiRequest<KanbanTask>(
      `/workspaces/${workspaceId}/projects/${projectId}/kanban/tasks/${taskId}/move`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
};

export const wikiApi = {
  list: (workspaceId: string, projectId: string) =>
    apiRequest<WikiDocument[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/wiki-documents`,
    ),
  create: (
    workspaceId: string,
    projectId: string,
    input: CreateWikiDocumentInput,
  ) =>
    apiRequest<WikiDocument>(
      `/workspaces/${workspaceId}/projects/${projectId}/wiki-documents`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  update: (
    workspaceId: string,
    projectId: string,
    documentId: string,
    input: UpdateWikiDocumentInput,
  ) =>
    apiRequest<WikiDocument>(
      `/workspaces/${workspaceId}/projects/${projectId}/wiki-documents/${documentId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  delete: (workspaceId: string, projectId: string, documentId: string) =>
    apiRequest<void>(
      `/workspaces/${workspaceId}/projects/${projectId}/wiki-documents/${documentId}`,
      { method: "DELETE" },
    ),
};

export type CurrentUser = AuthenticatedUser;

export const authApi = {
  login: (input: LoginInput) =>
    //this code will send the login request to the backend API at the endpoint /auth/login with the provided input (email and password). The apiRequest function handles the HTTP request and response, returning a promise that resolves to an AuthResponse object containing the authenticated user's information and access token.
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  register: (input: RegisterInput) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  //logout does not contains any datas, so we just tell the backend we are logging out by sending a POST request to the /auth/logout endpoint. The apiRequest function handles the HTTP request and response, returning a promise that resolves to void since there is no data expected in the response.
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),

  me: () => apiRequest<CurrentUser>("/auth/me"),
};

export const userApi = {
  updateProfile: (input: UpdateProfileInput) =>
    apiRequest<AuthenticatedUser>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteAccount: () => apiRequest<void>("/users/me", { method: "DELETE" }),
};
