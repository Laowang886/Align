import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CreateSprintInput,
  Sprint,
  SprintStatus,
  UpdateSprintStatusInput,
  WorkspaceRole,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { assertWorkspacePermission } from '../workspaces/workspace.permissions';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<Sprint[]> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const sprints = await this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return sprints.map(toSprint);
  }

  async create(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: CreateSprintInput,
  ): Promise<Sprint> {
    const role = await this.assertProjectAccess(userId, workspaceId, projectId);
    assertWorkspacePermission(role, 'manage_sprint');
    const sprint = await this.prisma.sprint.create({
      data: {
        projectId,
        name: input.name,
        goal: input.goal ?? '',
        startDate: toDatabaseDate(input.startDate),
        endDate: toDatabaseDate(input.endDate),
      },
    });
    return toSprint(sprint);
  }

  async updateStatus(
    userId: string,
    workspaceId: string,
    projectId: string,
    sprintId: string,
    input: UpdateSprintStatusInput,
  ): Promise<Sprint> {
    const role = await this.assertProjectAccess(userId, workspaceId, projectId);
    assertWorkspacePermission(role, 'manage_sprint');
    const existing = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });
    if (!existing) throw new NotFoundException('Sprint not found');

    const expectedStatus: SprintStatus =
      input.status === 'ACTIVE' ? 'PLANNED' : 'ACTIVE';
    if (existing.status !== expectedStatus) {
      throw new UnprocessableEntityException(
        `Sprint can only transition from ${expectedStatus} to ${input.status}`,
      );
    }

    if (input.status === 'ACTIVE') {
      const activeSprint = await this.prisma.sprint.findFirst({
        where: { projectId, status: 'ACTIVE', id: { not: sprintId } },
        select: { id: true },
      });
      if (activeSprint) {
        throw new ConflictException('Project already has an active sprint');
      }
    }

    try {
      const sprint = await this.prisma.sprint.update({
        where: { id: sprintId },
        data: { status: input.status },
      });
      return toSprint(sprint);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Project already has an active sprint');
      }
      throw error;
    }
  }

  private async assertProjectAccess(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<WorkspaceRole> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Workspace not found');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return membership.role;
  }
}

function toDatabaseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toSprint(sprint: {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  createdAt: Date;
  updatedAt: Date;
}): Sprint {
  return {
    ...sprint,
    startDate: sprint.startDate.toISOString().slice(0, 10),
    endDate: sprint.endDate.toISOString().slice(0, 10),
    createdAt: sprint.createdAt.toISOString(),
    updatedAt: sprint.updatedAt.toISOString(),
  };
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
