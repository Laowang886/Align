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
} from "@repo/shared";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

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
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};
export type AuthResponse = { user: CurrentUser };
export const authApi = {
  login: (input: { email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  register: (input: { name: string; email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
  me: () => apiRequest<CurrentUser>("/auth/me"),
};
