import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type {
  CreateWorkspaceInput,
  InviteWorkspaceMemberInput,
  UpdateWorkspaceInput,
  WorkspaceDetails,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../dashboard/activity.service';
import {
  assertWorkspacePermission,
  canChangeWorkspaceMemberRole,
  canRemoveWorkspaceMember,
  canTransferWorkspaceOwnership,
} from './workspace.permissions';

type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  avatarPreset: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { members: number; projects: number };
};

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activity?: ActivityService,
  ) {}

  async create(
    ownerId: string,
    input: CreateWorkspaceInput,
  ): Promise<WorkspaceSummary> {
    const requestedSlug = input.slug
      ? normalizeSlug(input.slug)
      : normalizeSlug(input.name);
    const baseSlug = requestedSlug || 'workspace';
    const hasCustomSlug = input.slug !== undefined;
    if (input.slug && !requestedSlug) {
      throw new BadRequestException(
        'Workspace slug must contain letters or numbers',
      );
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = hasCustomSlug
        ? attempt === 0
          ? baseSlug
          : `${baseSlug}-${randomUUID().slice(0, 8)}`
        : `${baseSlug}-${randomUUID().slice(0, 8)}`;
      try {
        const workspace = await this.prisma.$transaction((transaction) =>
          transaction.workspace.create({
            data: {
              name: input.name.trim(), slug,
              description: normalizeDescription(input.description),
              avatarUrl: input.avatarUrl, avatarPreset: input.avatarPreset,
              ownerId, members: { create: { userId: ownerId, role: 'OWNER' } },
            },
            include: { _count: { select: { members: true, projects: true } } },
          }),
        );
        await this.activity?.record({ workspaceId: workspace.id, actorId: ownerId, action: 'created workspace', resourceType: 'WORKSPACE', resourceId: workspace.id, summary: workspace.name });
        return toWorkspaceSummary(workspace, 'OWNER');
      } catch (error: unknown) {
        if (!isUniqueConstraintError(error) || attempt === 2) {
          throwWorkspaceConflict(error);
        }
      }
    }

    throw new ConflictException('Workspace slug is already in use');
  }

  async listForUser(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: { _count: { select: { members: true, projects: true } } },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((membership) =>
      toWorkspaceSummary(membership.workspace, membership.role),
    );
  }

  async getForUser(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceDetails> {
    const membership = await this.findMembership(userId, workspaceId);
    return toWorkspaceSummary(membership.workspace, membership.role);
  }

  async update(
    userId: string,
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceDetails> {
    const membership = await this.findMembership(userId, workspaceId);
    assertWorkspacePermission(membership.role, 'update');

    try {
      const workspace = await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name.trim() }),
          ...(input.slug === undefined
            ? {}
            : { slug: normalizeSlug(input.slug) }),
          ...(input.description === undefined
            ? {}
            : { description: normalizeDescription(input.description) }),
        },
        include: { _count: { select: { members: true, projects: true } } },
      });
      await this.activity?.record({
        workspaceId,
        actorId: userId,
        action: 'updated workspace',
        resourceType: 'WORKSPACE',
        resourceId: workspaceId,
        summary: workspace.name,
      });
      return toWorkspaceSummary(workspace, membership.role);
    } catch (error: unknown) {
      throwWorkspaceConflict(error);
    }
  }

  async delete(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.findMembership(userId, workspaceId);
    assertWorkspacePermission(membership.role, 'delete');
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
  }

  async listMembers(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    await this.findMembership(userId, workspaceId);
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    const roleOrder: Record<WorkspaceRole, number> = {
      OWNER: 0,
      ADMIN: 1,
      MEMBER: 2,
    };
    return members
      .map(toWorkspaceMember)
      .sort((first, second) => roleOrder[first.role] - roleOrder[second.role]);
  }

  async updateMemberRole(
    userId: string,
    workspaceId: string,
    memberId: string,
    role: 'ADMIN' | 'MEMBER',
  ): Promise<WorkspaceMember> {
    const actor = await this.findMembership(userId, workspaceId);
    const target = await this.findMember(workspaceId, memberId);
    if (!canChangeWorkspaceMemberRole(actor.role, target.role, role)) {
      throw new ForbiddenException('You cannot change this member role');
    }
    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
    await this.activity?.record({
      workspaceId,
      actorId: userId,
      action: 'changed member role',
      resourceType: 'WORKSPACE_MEMBER',
      resourceId: memberId,
      summary: `${updated.user.name} is now ${role}`,
    });
    return toWorkspaceMember(updated);
  }

  async inviteMember(
    userId: string,
    workspaceId: string,
    input: InviteWorkspaceMemberInput,
  ): Promise<WorkspaceMember> {
    const actor = await this.findMembership(userId, workspaceId);
    const canInvite =
      actor.role === 'OWNER' ||
      (actor.role === 'ADMIN' && input.role === 'MEMBER');
    if (!canInvite)
      throw new ForbiddenException('You cannot invite a member with this role');

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (!invitedUser)
      throw new NotFoundException(
        'No registered account was found for this email',
      );
    const existing = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: invitedUser.id, workspaceId } },
    });
    if (existing)
      throw new ConflictException('This user is already a workspace member');

    try {
      const member = await this.prisma.workspaceMember.create({
        data: { workspaceId, userId: invitedUser.id, role: input.role },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });
      await this.activity?.record({
        workspaceId,
        actorId: userId,
        action: 'invited member',
        resourceType: 'WORKSPACE_MEMBER',
        resourceId: member.id,
        summary: `${member.user.name} joined as ${member.role}`,
      });
      return toWorkspaceMember(member);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('This user is already a workspace member');
      }
      throw error;
    }
  }

  async removeMember(
    userId: string,
    workspaceId: string,
    memberId: string,
  ): Promise<void> {
    const actor = await this.findMembership(userId, workspaceId);
    const target = await this.findMember(workspaceId, memberId);
    if (target.userId === userId) {
      throw new BadRequestException(
        'Use the leave workspace action to remove yourself',
      );
    }
    if (!canRemoveWorkspaceMember(actor.role, target.role)) {
      throw new ForbiddenException('You cannot remove this workspace member');
    }
    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
    await this.activity?.record({
      workspaceId,
      actorId: userId,
      action: 'removed member',
      resourceType: 'WORKSPACE_MEMBER',
      resourceId: memberId,
      summary: 'Workspace access removed',
    });
  }

  async leave(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.findMembership(userId, workspaceId);
    if (membership.role === 'OWNER') {
      if (membership.workspace._count.members > 1) {
        throw new ConflictException(
          'Transfer workspace ownership before leaving',
        );
      }
      await this.prisma.workspace.delete({ where: { id: workspaceId } });
      return;
    }
    await this.prisma.workspaceMember.delete({ where: { id: membership.id } });
  }

  async transferOwnership(
    userId: string,
    workspaceId: string,
    targetMemberId: string,
  ): Promise<void> {
    const actor = await this.findMembership(userId, workspaceId);
    const target = await this.findMember(workspaceId, targetMemberId);
    if (
      !canTransferWorkspaceOwnership(actor.role, target.role) ||
      target.userId === userId
    ) {
      throw new ForbiddenException(
        'You cannot transfer ownership to this member',
      );
    }
    await this.prisma.$transaction([
      this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { ownerId: target.userId },
      }),
      this.prisma.workspaceMember.update({
        where: { id: actor.id },
        data: { role: 'ADMIN' },
      }),
      this.prisma.workspaceMember.update({
        where: { id: target.id },
        data: { role: 'OWNER' },
      }),
    ]);
    await this.activity?.record({
      workspaceId,
      actorId: userId,
      action: 'transferred ownership',
      resourceType: 'WORKSPACE_MEMBER',
      resourceId: targetMemberId,
      summary: 'Workspace ownership transferred',
    });
  }

  private async findMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: {
        workspace: {
          include: { _count: { select: { members: true, projects: true } } },
        },
      },
    });
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
    return membership;
  }

  private async findMember(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Workspace member not found');
    return member;
  }
}

function toWorkspaceMember(member: {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}): WorkspaceMember {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
    user: member.user,
  };
}

export function normalizeSlug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeDescription(value: string | null | undefined): string | null {
  const description = value?.trim();
  return description ? description : null;
}

function toWorkspaceSummary(
  workspace: WorkspaceRecord,
  currentUserRole: WorkspaceRole,
): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    avatarUrl: workspace.avatarUrl,
    avatarPreset: workspace.avatarPreset,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
    currentUserRole,
    memberCount: workspace._count.members,
    projectCount: workspace._count.projects,
  };
}

function throwWorkspaceConflict(error: unknown): never {
  if (isUniqueConstraintError(error)) {
    throw new ConflictException('Workspace slug is already in use');
  }
  throw error;
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
