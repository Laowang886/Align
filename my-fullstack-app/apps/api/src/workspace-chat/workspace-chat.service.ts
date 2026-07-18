import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateWorkspaceChatConversationInput,
  CreateWorkspaceChatMessageInput,
  UpdateWorkspaceChatConversationInput,
} from './dto/workspace-chat.dto';

@Injectable()
export class WorkspaceChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(
    userId: string,
    workspaceId: string,
    input: CreateWorkspaceChatConversationInput,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    if (input.projectId) {
      await this.assertProjectBelongsToWorkspace(workspaceId, input.projectId);
    }

    return this.prisma.workspaceChatConversation.create({
      data: {
        userId,
        workspaceId,
        projectId: input.projectId ?? null,
      },
    });
  }

  async listConversations(userId: string, workspaceId: string) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    return this.prisma.workspaceChatConversation.findMany({
      where: {
        userId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        workspaceId: true,
        projectId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getConversation(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    const conversation = await this.prisma.workspaceChatConversation.findFirst({
      where: this.ownedConversationWhere(userId, workspaceId, conversationId),
      include: {
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            actionPlan: {
              include: {
                actions: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
            },
          },
        },
        plans: {
          include: {
            actions: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async updateConversationTitle(
    userId: string,
    workspaceId: string,
    conversationId: string,
    input: UpdateWorkspaceChatConversationInput,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    const conversation = await this.prisma.$transaction(async (tx) => {
      const result = await tx.workspaceChatConversation.updateMany({
        where: this.ownedConversationWhere(userId, workspaceId, conversationId),
        data: {
          title: input.title,
        },
      });

      if (result.count === 0) {
        return null;
      }

      return tx.workspaceChatConversation.findFirst({
        where: this.ownedConversationWhere(userId, workspaceId, conversationId),
        select: {
          id: true,
          workspaceId: true,
          projectId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              name: true,
              key: true,
            },
          },
        },
      });
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async deleteConversation(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ): Promise<void> {
    await this.assertWorkspaceAccess(userId, workspaceId);

    const deletedAt = new Date();
    const purgeAt = new Date(deletedAt);
    purgeAt.setDate(purgeAt.getDate() + 30);

    const result = await this.prisma.workspaceChatConversation.updateMany({
      where: this.ownedConversationWhere(userId, workspaceId, conversationId),
      data: {
        deletedAt,
        purgeAt,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Conversation not found');
    }
  }

  async createUserMessage(
    userId: string,
    workspaceId: string,
    conversationId: string,
    input: CreateWorkspaceChatMessageInput,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    await this.assertConversationAccess(userId, workspaceId, conversationId);

    const [message] = await this.prisma.$transaction([
      this.prisma.workspaceChatMessage.create({
        data: {
          conversationId,
          role: 'USER',
          content: input.content,
        },
      }),
      this.prisma.workspaceChatConversation.update({
        where: {
          id: conversationId,
        },
        data: {
          updatedAt: new Date(),
        },
      }),
    ]);

    return message;
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

  private async assertProjectBelongsToWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
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

  private async assertConversationAccess(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.prisma.workspaceChatConversation.findFirst({
      where: this.ownedConversationWhere(userId, workspaceId, conversationId),
      select: {
        id: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
  }

  private ownedConversationWhere(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ) {
    return {
      id: conversationId,
      workspaceId,
      userId,
      deletedAt: null,
    };
  }
}
