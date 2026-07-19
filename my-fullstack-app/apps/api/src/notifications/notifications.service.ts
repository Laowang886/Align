import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Notification as NotificationDto,
  NotificationPage,
  NotificationPreferences,
  NotificationType,
  UpdateNotificationPreferencesInput,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

type CreateNotificationInput = {
  recipientId: string;
  actorId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  messageId?: string | null;
  type: NotificationType;
  eventId: string;
  title: string;
  content: string;
  link: string;
};

const preferenceSelect = {
  notificationsEnabled: true,
  kanbanNotificationsEnabled: true,
  chatNotificationsEnabled: true,
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    recipientId: string,
    options: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
  ): Promise<NotificationPage> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const where = {
      recipientId,
      ...(options.unreadOnly ? { isRead: false } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      items: items.map(toNotificationDto),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  async unreadCount(recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId, isRead: false },
    });
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    return preferences ? toPreferencesDto(preferences) : defaultPreferences();
  }

  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...defaultPreferences(), ...input },
      update: input,
    });
    return toPreferencesDto(preferences);
  }

  async markRead(recipientId: string, id: string): Promise<NotificationDto> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.isRead) return toNotificationDto(notification);
    return toNotificationDto(
      await this.prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      }),
    );
  }

  async markAllRead(recipientId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  async remove(recipientId: string, id: string): Promise<void> {
    const result = await this.prisma.notification.deleteMany({
      where: { id, recipientId },
    });
    if (result.count === 0)
      throw new NotFoundException('Notification not found');
  }

  async createNotification(input: CreateNotificationInput): Promise<void> {
    await this.prisma.notification.create({ data: input });
  }

  async notifyWorkspaceChatMessage(input: {
    actorId: string;
    actorName: string;
    workspaceId: string;
    workspaceName: string;
    channelId: string;
    messageId: string;
  }): Promise<void> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: input.workspaceId, userId: { not: input.actorId } },
      select: {
        userId: true,
        user: {
          select: {
            notificationPreference: { select: preferenceSelect },
          },
        },
      },
    });
    const recipients = members.filter(({ user }) =>
      allowsNotification(
        user.notificationPreference ?? defaultPreferences(),
        'WORKSPACE_CHAT_MESSAGE',
      ),
    );
    if (recipients.length === 0) return;
    const content = `${input.actorName} 在 ${input.workspaceName} 的 Workspace Chat 中发送了新消息`;
    await this.prisma.notification.createMany({
      data: recipients.map(({ userId }) => ({
        recipientId: userId,
        actorId: input.actorId,
        workspaceId: input.workspaceId,
        messageId: input.messageId,
        type: 'WORKSPACE_CHAT_MESSAGE' as const,
        eventId: input.messageId,
        title: 'New workspace chat message',
        content,
        link: `/workspaces/${input.workspaceId}/chat?channelId=${input.channelId}`,
      })),
      skipDuplicates: true,
    });
  }

  async notifyDirectChatMessage(input: {
    actorId: string;
    actorName: string;
    recipientId: string;
    workspaceId: string;
    workspaceName: string;
    messageId: string;
  }): Promise<void> {
    if (input.actorId === input.recipientId) return;
    const preferences = await this.getPreferences(input.recipientId);
    if (!allowsNotification(preferences, 'WORKSPACE_CHAT_MESSAGE')) return;
    await this.createNotification({
      recipientId: input.recipientId,
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      messageId: input.messageId,
      type: 'WORKSPACE_CHAT_MESSAGE',
      eventId: input.messageId,
      title: 'New direct message',
      content: `${input.actorName} 在 ${input.workspaceName} 中给你发送了私聊消息`,
      link: `/workspaces/${input.workspaceId}/chat?directUserId=${input.actorId}`,
    });
  }

  async notifyTaskAssigned(input: {
    actorId: string;
    recipientId: string;
    workspaceId: string;
    projectId: string;
    taskId: string;
    taskCode: string;
    eventId: string;
  }): Promise<void> {
    if (input.actorId === input.recipientId) return;
    const [actor, preferences] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.actorId },
        select: { name: true },
      }),
      this.getPreferences(input.recipientId),
    ]);
    if (!actor || !allowsNotification(preferences, 'TASK_ASSIGNED')) return;
    await this.createNotification({
      recipientId: input.recipientId,
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      taskId: input.taskId,
      type: 'TASK_ASSIGNED',
      eventId: input.eventId,
      title: 'Task assigned to you',
      content: `${actor.name} 将任务 ${input.taskCode} 分配给了你`,
      link: `/projects/${input.projectId}/kanban?taskId=${input.taskId}`,
    });
  }
}

function defaultPreferences(): NotificationPreferences {
  return {
    notificationsEnabled: true,
    kanbanNotificationsEnabled: true,
    chatNotificationsEnabled: true,
  };
}

function allowsNotification(
  preferences: NotificationPreferences,
  type: NotificationType,
): boolean {
  if (!preferences.notificationsEnabled) return false;
  return type === 'TASK_ASSIGNED'
    ? preferences.kanbanNotificationsEnabled
    : preferences.chatNotificationsEnabled;
}

function toPreferencesDto(
  preferences: NotificationPreferences,
): NotificationPreferences {
  return {
    notificationsEnabled: preferences.notificationsEnabled,
    kanbanNotificationsEnabled: preferences.kanbanNotificationsEnabled,
    chatNotificationsEnabled: preferences.chatNotificationsEnabled,
  };
}

function toNotificationDto(notification: {
  id: string;
  recipientId: string;
  actorId: string | null;
  workspaceId: string | null;
  projectId: string | null;
  taskId: string | null;
  messageId: string | null;
  type: NotificationType;
  title: string;
  content: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}): NotificationDto {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}
