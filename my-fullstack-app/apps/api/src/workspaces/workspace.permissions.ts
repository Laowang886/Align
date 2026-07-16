import { ForbiddenException } from '@nestjs/common';
import type { WorkspaceRole } from '@repo/shared';

export type WorkspaceAction =
  | 'view'
  | 'update'
  | 'delete'
  | 'create_project'
  | 'manage_sprint'
  | 'create_wiki_document'
  | 'edit_wiki_document'
  | 'invite_member'
  | 'remove_member'
  | 'change_member_role'
  | 'transfer_ownership';

const ROLE_PERMISSIONS: Record<WorkspaceRole, ReadonlySet<WorkspaceAction>> = {
  OWNER: new Set([
    'view',
    'update',
    'delete',
    'create_project',
    'manage_sprint',
    'create_wiki_document',
    'edit_wiki_document',
    'invite_member',
    'remove_member',
    'change_member_role',
    'transfer_ownership',
  ]),
  ADMIN: new Set([
    'view',
    'update',
    'create_project',
    'manage_sprint',
    'create_wiki_document',
    'edit_wiki_document',
    'invite_member',
    'remove_member',
  ]),
  MEMBER: new Set(['view', 'create_wiki_document', 'edit_wiki_document']),
};

export function hasWorkspacePermission(
  role: WorkspaceRole,
  action: WorkspaceAction,
): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}

export function assertWorkspacePermission(
  role: WorkspaceRole,
  action: WorkspaceAction,
): void {
  if (!hasWorkspacePermission(role, action)) {
    throw new ForbiddenException(
      'You do not have permission to perform this action',
    );
  }
}

export function canRemoveWorkspaceMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  if (targetRole === 'OWNER') return false;
  if (actorRole === 'OWNER') return true;
  return actorRole === 'ADMIN' && targetRole === 'MEMBER';
}

export function canChangeWorkspaceMemberRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
  nextRole: WorkspaceRole,
): boolean {
  if (actorRole !== 'OWNER') return false;
  if (targetRole === 'OWNER' || nextRole === 'OWNER') return false;
  return targetRole !== nextRole;
}

export function canTransferWorkspaceOwnership(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  return actorRole === 'OWNER' && targetRole !== 'OWNER';
}

export function canLeaveWorkspace(
  role: WorkspaceRole,
  memberCount: number,
): boolean {
  if (role !== 'OWNER') return true;
  return memberCount === 1;
}
