import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_RECENT_ACTIVITY = 50;
const MAX_WIKI_DOCUMENTS = 20;
const MAX_TASKS = 100;
const MAX_PROJECTS = 50;
const WIKI_SUMMARY_LENGTH = 1_000;

@Injectable()
export class WorkspaceChatRetrievalService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaceOverview(userId: string, workspaceId: string) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    return this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        projects: {
          select: {
            id: true,
            name: true,
            key: true,
            description: true,
            color: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: MAX_PROJECTS,
        },
      },
    });
  }

  async getProjectOverview(
    userId: string,
    workspaceId: string,
    projectId: string,
  ) {
    await this.assertProjectAccess(userId, workspaceId, projectId);

    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        key: true,
        description: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getProjectTasks(
    userId: string,
    workspaceId: string,
    projectId: string,
  ) {
    await this.assertProjectAccess(userId, workspaceId, projectId);

    return this.prisma.task.findMany({
      where: {
        column: {
          board: {
            project: {
              id: projectId,
              workspaceId,
            },
          },
        },
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        storyPoints: true,
        order: true,
        columnId: true,
        sprintId: true,
        createdAt: true,
        updatedAt: true,
        column: {
          select: {
            id: true,
            title: true,
            order: true,
            board: {
              select: {
                id: true,
                title: true,
                projectId: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: MAX_TASKS,
    });
  }

  async getProjectWikiDocuments(
    userId: string,
    workspaceId: string,
    projectId: string,
  ) {
    await this.assertProjectAccess(userId, workspaceId, projectId);

    const documents = await this.prisma.wikiDocument.findMany({
      where: {
        workspaceId,
        projectId,
      },
      select: {
        id: true,
        workspaceId: true,
        projectId: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: MAX_WIKI_DOCUMENTS,
    });

    return documents.map(({ content, ...document }) => ({
      ...document,
      summary: content.slice(0, WIKI_SUMMARY_LENGTH),
    }));
  }

  async getProjectSprints(
    userId: string,
    workspaceId: string,
    projectId: string,
  ) {
    await this.assertProjectAccess(userId, workspaceId, projectId);

    return this.prisma.sprint.findMany({
      where: {
        project: {
          id: projectId,
          workspaceId,
        },
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        goal: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getRecentWorkspaceActivity(userId: string, workspaceId: string) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    return this.prisma.activityLog.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        projectId: true,
        action: true,
        resourceType: true,
        resourceId: true,
        summary: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: MAX_RECENT_ACTIVITY,
    });
  }

  async getWorkspaceBoardTasks(userId: string, workspaceId: string) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    return this.prisma.board.findMany({
      where: {
        project: {
          workspaceId,
        },
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        columns: {
          select: {
            id: true,
            title: true,
            order: true,
            color: true,
            category: true,
            tasks: {
              select: {
                id: true,
                code: true,
                title: true,
                description: true,
                priority: true,
                dueDate: true,
                storyPoints: true,
                order: true,
                sprintId: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
              take: MAX_TASKS,
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });
  }

  private async assertWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
  }

  private async assertProjectAccess(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    await this.assertWorkspaceAccess(userId, workspaceId);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
