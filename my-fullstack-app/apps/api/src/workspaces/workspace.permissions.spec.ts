import { ForbiddenException } from '@nestjs/common';
import {
  assertWorkspacePermission,
  canChangeWorkspaceMemberRole,
  canLeaveWorkspace,
  canRemoveWorkspaceMember,
  canTransferWorkspaceOwnership,
  hasWorkspacePermission,
  type WorkspaceAction,
} from './workspace.permissions';

describe('workspace permissions', () => {
  const allActions: WorkspaceAction[] = [
    'view',
    'update',
    'delete',
    'create_project',
    'create_wiki_document',
    'edit_wiki_document',
    'invite_member',
    'remove_member',
    'change_member_role',
    'transfer_ownership',
  ];

  it('allows OWNER to perform every workspace action', () => {
    expect(
      allActions.every((action) => hasWorkspacePermission('OWNER', action)),
    ).toBe(true);
  });

  it('limits ADMIN to non-owner administration', () => {
    expect(hasWorkspacePermission('ADMIN', 'view')).toBe(true);
    expect(hasWorkspacePermission('ADMIN', 'update')).toBe(true);
    expect(hasWorkspacePermission('ADMIN', 'create_project')).toBe(true);
    expect(hasWorkspacePermission('ADMIN', 'invite_member')).toBe(true);
    expect(hasWorkspacePermission('ADMIN', 'delete')).toBe(false);
    expect(hasWorkspacePermission('ADMIN', 'transfer_ownership')).toBe(false);
  });

  it('allows MEMBER to collaborate on wiki documents', () => {
    expect(hasWorkspacePermission('MEMBER', 'view')).toBe(true);
    expect(hasWorkspacePermission('MEMBER', 'create_wiki_document')).toBe(true);
    expect(hasWorkspacePermission('MEMBER', 'edit_wiki_document')).toBe(true);
    expect(hasWorkspacePermission('MEMBER', 'update')).toBe(false);
    expect(() => assertWorkspacePermission('MEMBER', 'invite_member')).toThrow(
      ForbiddenException,
    );
  });

  it('never allows an owner to be removed through member removal', () => {
    expect(canRemoveWorkspaceMember('OWNER', 'OWNER')).toBe(false);
    expect(canRemoveWorkspaceMember('ADMIN', 'OWNER')).toBe(false);
  });

  it('allows ADMIN to remove MEMBER but not ADMIN', () => {
    expect(canRemoveWorkspaceMember('ADMIN', 'MEMBER')).toBe(true);
    expect(canRemoveWorkspaceMember('ADMIN', 'ADMIN')).toBe(false);
  });

  it('reserves role changes and ownership transfer for OWNER', () => {
    expect(canChangeWorkspaceMemberRole('OWNER', 'MEMBER', 'ADMIN')).toBe(true);
    expect(canChangeWorkspaceMemberRole('ADMIN', 'MEMBER', 'ADMIN')).toBe(
      false,
    );
    expect(canChangeWorkspaceMemberRole('OWNER', 'ADMIN', 'OWNER')).toBe(false);
    expect(canTransferWorkspaceOwnership('OWNER', 'ADMIN')).toBe(true);
    expect(canTransferWorkspaceOwnership('ADMIN', 'MEMBER')).toBe(false);
  });

  it('requires an owner with other members to transfer ownership before leaving', () => {
    expect(canLeaveWorkspace('OWNER', 2)).toBe(false);
    expect(canLeaveWorkspace('OWNER', 1)).toBe(true);
    expect(canLeaveWorkspace('ADMIN', 2)).toBe(true);
    expect(canLeaveWorkspace('MEMBER', 2)).toBe(true);
  });
});
