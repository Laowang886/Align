export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: WorkspaceMemberUser;
}

export interface WorkspaceSummary extends Workspace {
  currentUserRole: WorkspaceRole;
  memberCount: number;
  projectCount: number;
}

export type WorkspaceDetails = WorkspaceSummary;

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  description?: string | null;
}

export interface UpdateWorkspaceMemberRoleInput {
  role: Exclude<WorkspaceRole, 'OWNER'>;
}

export interface InviteWorkspaceMemberInput {
  email: string;
  role: Exclude<WorkspaceRole, 'OWNER'>;
}

export interface TransferWorkspaceOwnershipInput {
  memberId: string;
}
