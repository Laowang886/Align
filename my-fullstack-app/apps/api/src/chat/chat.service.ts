import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ChatChannel,
  ChatConversation,
  ChatMessageAttachment,
  ChatMessage,
  ChatUserSummary,
  CreateChatChannelInput,
  CreateChatMessageInput,
  UpdateChatChannelInput,
  UpdateChatChannelNoticeInput,
  WorkspaceChatState,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChatFileStorageService,
  type ChatUploadedFile,
} from './chat-file-storage.service';

const DIRECT_CHANNEL_PREFIX = 'dm:';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: ChatFileStorageService = new ChatFileStorageService(),
  ) {}

  async getWorkspaceChatState(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceChatState> {
    await this.requireWorkspaceMember(userId, workspaceId);
    return {
      channels: await this.listPublicChannels(workspaceId),
    };
  }

  async createChannel(
    userId: string,
    workspaceId: string,
    input: CreateChatChannelInput,
  ): Promise<ChatChannel> {
    await this.requireWorkspaceMember(userId, workspaceId);
    try {
      const channel = await this.prisma.channel.create({
        data: { workspaceId, name: input.name },
      });
      return toChatChannel(channel);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Channel already exists');
      }
      throw error;
    }
  }

  async getChannelConversation(
    userId: string,
    workspaceId: string,
    channelId: string,
  ): Promise<ChatConversation> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const channel = await this.requireCustomChannel(workspaceId, channelId);
    return toChannelConversation(channel);
  }

  async getChannelMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
  ): Promise<ChatMessage[]> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const channel = await this.requireCustomChannel(workspaceId, channelId);
    return this.listChannelMessages(channel.id);
  }

  async updateChannel(
    userId: string,
    workspaceId: string,
    channelId: string,
    input: UpdateChatChannelInput,
  ): Promise<ChatChannel> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (!isPublicChannelName(channel.name)) {
      throw new BadRequestException('Channel cannot be renamed');
    }
    if (channel.name === input.name) return toChatChannel(channel);

    try {
      const updated = await this.prisma.channel.update({
        where: { id: channel.id },
        data: { name: input.name },
      });
      return toChatChannel(updated);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A channel with this name already exists.');
      }
      throw error;
    }
  }

  async updateChannelNotice(
    userId: string,
    workspaceId: string,
    channelId: string,
    input: UpdateChatChannelNoticeInput,
  ): Promise<ChatChannel> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (!isPublicChannelName(channel.name)) {
      throw new BadRequestException('Channel notice is only available for public channels');
    }

    if (channel.notice === input.notice) return toChatChannel(channel);

    const updated = await this.prisma.channel.update({
      where: { id: channel.id },
      data: { notice: input.notice },
    });
    return toChatChannel(updated);
  }

  async createChannelMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    input: CreateChatMessageInput,
    files: ChatUploadedFile[] = [],
  ): Promise<ChatMessage> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const channel = await this.requireCustomChannel(workspaceId, channelId);
    return this.createMessage(channel.id, userId, input.content, files);
  }

  async clearChannelMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
  ): Promise<void> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (
      !isPublicChannelName(channel.name) &&
      !isDirectChannelParticipant(channel.name, userId)
    ) {
      throw new ForbiddenException('Direct message not found');
    }
    const attachments = await this.listAttachmentStoragePathsForChannel(
      channel.id,
    );
    await this.prisma.message.deleteMany({ where: { channelId: channel.id } });
    await this.fileStorage.deleteFiles(attachments);
  }

  async deleteChannel(
    userId: string,
    workspaceId: string,
    channelId: string,
  ): Promise<void> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (!isPublicChannelName(channel.name)) {
      throw new BadRequestException('Channel cannot be deleted');
    }

    const attachments = await this.listAttachmentStoragePathsForChannel(
      channel.id,
    );
    await this.prisma.channel.delete({ where: { id: channel.id } });
    await this.fileStorage.deleteFiles(attachments);
  }

  async getDirectConversation(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<ChatConversation> {
    const [currentMember, targetMember] = await Promise.all([
      this.requireWorkspaceMember(userId, workspaceId),
      this.findWorkspaceMember(targetUserId, workspaceId),
    ]);
    if (currentMember.userId === targetMember.userId) {
      throw new ForbiddenException('Direct messages require another member');
    }

    const channel = await this.findOrCreateChannel(
      workspaceId,
      directChannelName(userId, targetUserId),
    );
    return {
      kind: 'DIRECT',
      channel: toChatChannel(channel),
      title: targetMember.user.name,
      description: `Direct messages with ${targetMember.user.name}.`,
      directUser: targetMember.user,
    };
  }

  async getDirectMessages(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<ChatMessage[]> {
    await this.getDirectConversation(userId, workspaceId, targetUserId);
    const channel = await this.findOrCreateChannel(
      workspaceId,
      directChannelName(userId, targetUserId),
    );
    return this.listChannelMessages(channel.id);
  }

  async createDirectMessage(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    input: CreateChatMessageInput,
    files: ChatUploadedFile[] = [],
  ): Promise<ChatMessage> {
    await this.getDirectConversation(userId, workspaceId, targetUserId);
    const channel = await this.findOrCreateChannel(
      workspaceId,
      directChannelName(userId, targetUserId),
    );
    return this.createMessage(channel.id, userId, input.content, files);
  }

  async getAttachmentForDownload(
    userId: string,
    workspaceId: string,
    attachmentId: string,
  ): Promise<{
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    buffer: Buffer;
  }> {
    await this.requireWorkspaceMember(userId, workspaceId);
    const [attachment] = await this.prisma.$queryRaw<
      Array<StoredAttachmentRecord & { channelName: string }>
    >`
      SELECT
        attachment.id,
        attachment."messageId",
        attachment."originalName",
        attachment."storedName",
        attachment."mimeType",
        attachment."sizeBytes",
        attachment."storagePath",
        attachment."createdAt",
        channel.name AS "channelName"
      FROM "MessageAttachment" attachment
      JOIN "Message" message ON message.id = attachment."messageId"
      JOIN "Channel" channel ON channel.id = message."channelId"
      WHERE attachment.id = ${attachmentId}
        AND channel."teamId" = ${workspaceId}
      LIMIT 1
    `;
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (
      !isPublicChannelName(attachment.channelName) &&
      !isDirectChannelParticipant(attachment.channelName, userId)
    ) {
      throw new ForbiddenException('Attachment not found');
    }

    return {
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      buffer: await this.fileStorage.readFile(attachment.storagePath),
    };
  }

  private async requireWorkspaceMember(userId: string, workspaceId: string) {
    const membership = await this.findWorkspaceMember(userId, workspaceId);
    return membership;
  }

  private async findWorkspaceMember(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
    if (!membership) throw new NotFoundException('Workspace not found');
    return membership;
  }

  private async findOrCreateChannel(workspaceId: string, name: string) {
    const existing = await this.prisma.channel.findFirst({
      where: { workspaceId, name },
    });
    if (existing) return existing;

    try {
      return await this.prisma.channel.create({
        data: { workspaceId, name },
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        const channel = await this.prisma.channel.findFirst({
          where: { workspaceId, name },
        });
        if (channel) return channel;
      }
      throw error;
    }
  }

  private async listPublicChannels(
    workspaceId: string,
  ): Promise<ChatChannel[]> {
    const channels = await this.prisma.channel.findMany({
      where: {
        workspaceId,
        NOT: [{ name: { startsWith: DIRECT_CHANNEL_PREFIX } }],
      },
      orderBy: { name: 'asc' },
    });
    return channels.map(toChatChannel);
  }

  private async requireCustomChannel(workspaceId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel || !isPublicChannelName(channel.name)) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  private async listChannelMessages(channelId: string): Promise<ChatMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: { channelId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    const attachments = await this.listAttachmentsForMessages(
      messages.map((message) => message.id),
    );
    return messages.map((message) =>
      toChatMessage(message, attachments.get(message.id) ?? []),
    );
  }

  private async createMessage(
    channelId: string,
    authorId: string,
    content: string,
    files: ChatUploadedFile[] = [],
  ): Promise<ChatMessage> {
    if (!content.trim() && files.length === 0) {
      throw new BadRequestException('Message content or file is required');
    }

    const savedFiles = await this.fileStorage.saveFiles(files);
    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: { channelId, authorId, content },
          include: {
            author: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        });
        for (const file of savedFiles) {
          await tx.$executeRaw`
            INSERT INTO "MessageAttachment" (
              "id",
              "messageId",
              "originalName",
              "storedName",
              "mimeType",
              "sizeBytes",
              "storagePath"
            )
            VALUES (
              ${randomUUID()},
              ${created.id},
              ${file.originalName},
              ${file.storedName},
              ${file.mimeType},
              ${file.sizeBytes},
              ${file.storagePath}
            )
          `;
        }
        return created;
      });
      const attachments = await this.listAttachmentsForMessages([message.id]);
      return toChatMessage(message, attachments.get(message.id) ?? []);
    } catch (error) {
      await this.fileStorage.deleteFiles(
        savedFiles.map((file) => file.storagePath),
      );
      throw error;
    }
  }

  private async listAttachmentsForMessages(
    messageIds: string[],
  ): Promise<Map<string, ChatMessageAttachment[]>> {
    if (messageIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<StoredAttachmentRecord[]>`
      SELECT
        id,
        "messageId",
        "originalName",
        "storedName",
        "mimeType",
        "sizeBytes",
        "storagePath",
        "createdAt"
      FROM "MessageAttachment"
      WHERE "messageId" = ANY(${messageIds})
      ORDER BY "createdAt" ASC, id ASC
    `;
    const grouped = new Map<string, ChatMessageAttachment[]>();
    for (const row of rows) {
      const list = grouped.get(row.messageId) ?? [];
      list.push(toChatMessageAttachment(row));
      grouped.set(row.messageId, list);
    }
    return grouped;
  }

  private async listAttachmentStoragePathsForChannel(
    channelId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ storagePath: string }>>`
      SELECT attachment."storagePath"
      FROM "MessageAttachment" attachment
      JOIN "Message" message ON message.id = attachment."messageId"
      WHERE message."channelId" = ${channelId}
    `;
    return rows.map((row) => row.storagePath);
  }
}

type StoredAttachmentRecord = {
  id: string;
  messageId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: Date;
};

function toChatMessageAttachment(
  attachment: StoredAttachmentRecord,
): ChatMessageAttachment {
  return {
    id: attachment.id,
    messageId: attachment.messageId,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    isImage: attachment.mimeType.startsWith('image/'),
    createdAt: attachment.createdAt.toISOString(),
  };
}

function directChannelName(firstUserId: string, secondUserId: string): string {
  return `${DIRECT_CHANNEL_PREFIX}${[firstUserId, secondUserId].sort().join(':')}`;
}

function toChatChannel(channel: {
  id: string;
  workspaceId: string;
  name: string;
  notice: string | null;
}): ChatChannel {
  return {
    id: channel.id,
    workspaceId: channel.workspaceId,
    name: channel.name,
    notice: channel.notice,
  };
}

function toChannelConversation(channel: {
  id: string;
  workspaceId: string;
  name: string;
  notice: string | null;
}): ChatConversation {
  return {
    kind: 'CHANNEL',
    channel: toChatChannel(channel),
    title: `# ${channel.name}`,
    description: `Channel for ${channel.name}.`,
  };
}

function toChatMessage(message: {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  author: ChatUserSummary;
}, attachments: ChatMessageAttachment[] = []): ChatMessage {
  return {
    id: message.id,
    channelId: message.channelId,
    authorId: message.authorId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
    attachments,
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

function isPublicChannelName(name: string): boolean {
  return !name.startsWith(DIRECT_CHANNEL_PREFIX);
}

function isDirectChannelParticipant(name: string, userId: string): boolean {
  if (isPublicChannelName(name)) return false;
  return name
    .slice(DIRECT_CHANNEL_PREFIX.length)
    .split(':')
    .includes(userId);
}
