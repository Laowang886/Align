import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { CreateProjectInput, Project } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { assertWorkspacePermission } from '../workspaces/workspace.permissions';
import { ActivityService } from '../dashboard/activity.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activity?: ActivityService,
  ) {}

  async list(userId: string, workspaceId: string): Promise<Project[]> {
    await this.findMembership(userId, workspaceId);
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return projects.map(toProject);
  }

  async get(userId: string, projectId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: { members: { some: { userId } } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return toProject(project);
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<Project> {
    const membership = await this.findMembership(userId, workspaceId);
    assertWorkspacePermission(membership.role, 'create_project');
    try {
      const project = await this.prisma.project.create({
        data: {
          workspaceId,
          name: input.name,
          key: input.key,
          description: input.description ?? null,
          color: input.color,
        },
      });
      await this.activity?.record({
        workspaceId,
        actorId: userId,
        projectId: project.id,
        action: 'created project',
        resourceType: 'PROJECT',
        resourceId: project.id,
        summary: project.name,
      });
      return toProject(project);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Project key is already in use');
      }
      throw error;
    }
  }

  async delete(userId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: { members: { some: { userId } } },
      },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.findMembership(userId, project.workspaceId);
    assertWorkspacePermission(membership.role, 'delete');
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  private async findMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new NotFoundException('Workspace not found');
    return membership;
  }
}

function toProject(project: {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
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
