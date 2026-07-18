import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateHumanChatChannelInput,
  CreateHumanChatMessageInput,
} from './dto/human-chat.dto';

const DEFAULT_CHANNEL_NAME = 'all';

@Injectable()
export class HumanChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listChannels(userId: string, workspaceId: string) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    await this.getOrCreateAllChannel(workspaceId);

    return this.prisma.channel.findMany({
      where: { workspaceId },
      orderBy: [{ name: 'asc' }],
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async createChannel(
    userId: string,
    workspaceId: string,
    input: CreateHumanChatChannelInput,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    if (input.name === DEFAULT_CHANNEL_NAME) {
      return this.getOrCreateAllChannel(workspaceId);
    }

    const existing = await this.prisma.channel.findFirst({
      where: { workspaceId, name: input.name },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Channel already exists');

    return this.prisma.channel.create({
      data: {
        workspaceId,
        name: input.name,
      },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async listChannelMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    await this.assertChannelAccess(workspaceId, channelId);

    return this.prisma.message.findMany({
      where: { channelId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createChannelMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    input: CreateHumanChatMessageInput,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    await this.assertChannelAccess(workspaceId, channelId);

    return this.prisma.message.create({
      data: {
        channelId,
        authorId: userId,
        content: input.content,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async listDirectMessages(userId: string, workspaceId: string) {
    await this.assertWorkspaceAccess(userId, workspaceId);

    const conversations =
      await this.prisma.directMessageConversation.findMany({
        where: {
          workspaceId,
          OR: [{ firstUserId: userId }, { secondUserId: userId }],
        },
        include: {
          firstUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          secondUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

    return conversations.map((conversation) => ({
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      otherUser:
        conversation.firstUserId === userId
          ? conversation.secondUser
          : conversation.firstUser,
      updatedAt: conversation.updatedAt,
      lastMessage: conversation.messages[0] ?? null,
    }));
  }

  async getOrCreateDirectMessage(
    userId: string,
    workspaceId: string,
    memberId: string,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    const targetMembership = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!targetMembership) throw new NotFoundException('Member not found');
    if (targetMembership.userId === userId) {
      throw new BadRequestException('Choose another workspace member');
    }

    const [firstUserId, secondUserId] = sortUserPair(
      userId,
      targetMembership.userId,
    );

    const conversation =
      await this.prisma.directMessageConversation.upsert({
        where: {
          workspaceId_firstUserId_secondUserId: {
            workspaceId,
            firstUserId,
            secondUserId,
          },
        },
        create: {
          workspaceId,
          firstUserId,
          secondUserId,
        },
        update: {},
        include: {
          firstUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          secondUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

    return {
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      otherUser:
        conversation.firstUserId === userId
          ? conversation.secondUser
          : conversation.firstUser,
      updatedAt: conversation.updatedAt,
    };
  }

  async listDirectMessageMessages(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    await this.assertDirectMessageAccess(userId, workspaceId, conversationId);

    return this.prisma.directMessage.findMany({
      where: { conversationId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDirectMessage(
    userId: string,
    workspaceId: string,
    conversationId: string,
    input: CreateHumanChatMessageInput,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId);
    await this.assertDirectMessageAccess(userId, workspaceId, conversationId);

    const [message] = await this.prisma.$transaction([
      this.prisma.directMessage.create({
        data: {
          conversationId,
          authorId: userId,
          content: input.content,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.directMessageConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  private async getOrCreateAllChannel(workspaceId: string) {
    const existing = await this.prisma.channel.findFirst({
      where: { workspaceId, name: DEFAULT_CHANNEL_NAME },
      include: {
        _count: { select: { messages: true } },
      },
    });
    if (existing) return existing;

    return this.prisma.channel.create({
      data: { workspaceId, name: DEFAULT_CHANNEL_NAME },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  private async assertWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { id: true },
    });

    if (!membership) throw new NotFoundException('Workspace not found');
  }

  private async assertChannelAccess(
    workspaceId: string,
    channelId: string,
  ): Promise<void> {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      select: { id: true },
    });

    if (!channel) throw new NotFoundException('Channel not found');
  }

  private async assertDirectMessageAccess(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation =
      await this.prisma.directMessageConversation.findFirst({
        where: {
          id: conversationId,
          workspaceId,
          OR: [{ firstUserId: userId }, { secondUserId: userId }],
        },
        select: { id: true },
      });

    if (!conversation) throw new NotFoundException('Conversation not found');
  }
}

function sortUserPair(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort() as [string, string];
}
