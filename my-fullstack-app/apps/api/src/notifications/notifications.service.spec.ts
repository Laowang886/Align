/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

const now = new Date('2026-07-18T12:00:00.000Z');

describe('NotificationsService', () => {
  it('creates chat notifications for workspace members except the sender', async () => {
    const prisma = createPrismaMock();
    const service = new NotificationsService(prisma as never);

    await service.notifyWorkspaceChatMessage({
      actorId: 'user-1',
      actorName: 'Ada',
      workspaceId: 'workspace-1',
      workspaceName: 'Project',
      channelId: 'channel-1',
      messageId: 'message-1',
    });

    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    const data = prisma.notification.createMany.mock.calls[0]![0].data;
    expect(
      data.map((item: { recipientId: string }) => item.recipientId),
    ).toEqual(['user-2']);
    expect(data[0]).toMatchObject({
      messageId: 'message-1',
      eventId: 'message-1',
      link: '/workspaces/workspace-1/chat?channelId=channel-1',
    });
  });

  it('scopes reads and mutations to the current recipient', async () => {
    const prisma = createPrismaMock();
    const service = new NotificationsService(prisma as never);

    const page = await service.list('user-1');
    expect(page.items.map((item) => item.id)).toEqual(['notification-1']);
    await expect(
      service.markRead('user-1', 'notification-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.remove('user-1', 'notification-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the correct unread count and marks all owned notifications read', async () => {
    const prisma = createPrismaMock();
    const service = new NotificationsService(prisma as never);

    expect(await service.unreadCount('user-1')).toBe(1);
    expect(await service.markAllRead('user-1')).toBe(1);
    expect(await service.unreadCount('user-1')).toBe(0);
    expect(
      prisma.state.notifications.find((item) => item.id === 'notification-2')
        ?.isRead,
    ).toBe(false);
  });

  it('does not notify users when they assign a task to themselves', async () => {
    const prisma = createPrismaMock();
    const service = new NotificationsService(prisma as never);

    await service.notifyTaskAssigned({
      actorId: 'user-1',
      recipientId: 'user-1',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      taskId: 'task-1',
      taskCode: 'TASK-1',
      eventId: 'event-1',
    });

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('persists partial notification preference updates', async () => {
    const prisma = createPrismaMock();
    const service = new NotificationsService(prisma as never);

    expect(await service.getPreferences('user-1')).toEqual({
      notificationsEnabled: true,
      kanbanNotificationsEnabled: true,
      chatNotificationsEnabled: true,
    });
    await service.updatePreferences('user-1', {
      chatNotificationsEnabled: false,
    });

    expect(await service.getPreferences('user-1')).toMatchObject({
      notificationsEnabled: true,
      kanbanNotificationsEnabled: true,
      chatNotificationsEnabled: false,
    });
  });

  it('does not create chat notifications when chat alerts are disabled', async () => {
    const prisma = createPrismaMock();
    prisma.state.preferences.set('user-2', {
      notificationsEnabled: true,
      kanbanNotificationsEnabled: true,
      chatNotificationsEnabled: false,
    });
    const service = new NotificationsService(prisma as never);

    await service.notifyWorkspaceChatMessage({
      actorId: 'user-1',
      actorName: 'Ada',
      workspaceId: 'workspace-1',
      workspaceName: 'Project',
      channelId: 'channel-1',
      messageId: 'message-2',
    });
    await service.notifyDirectChatMessage({
      actorId: 'user-1',
      actorName: 'Ada',
      recipientId: 'user-2',
      workspaceId: 'workspace-1',
      workspaceName: 'Project',
      messageId: 'message-3',
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('does not create task notifications when kanban alerts are disabled', async () => {
    const prisma = createPrismaMock();
    prisma.state.preferences.set('user-2', {
      notificationsEnabled: true,
      kanbanNotificationsEnabled: false,
      chatNotificationsEnabled: true,
    });
    const service = new NotificationsService(prisma as never);

    await service.notifyTaskAssigned({
      actorId: 'user-1',
      recipientId: 'user-2',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      taskId: 'task-1',
      taskCode: 'TASK-1',
      eventId: 'task-assigned-1',
    });

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

function createPrismaMock() {
  const notifications = [
    notification('notification-1', 'user-1'),
    notification('notification-2', 'user-2'),
  ];
  const preferences = new Map<
    string,
    {
      notificationsEnabled: boolean;
      kanbanNotificationsEnabled: boolean;
      chatNotificationsEnabled: boolean;
    }
  >();
  const prisma = {
    state: { notifications, preferences },
    workspaceMember: {
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(
          [
            { userId: 'user-1', workspaceId: 'workspace-1' },
            { userId: 'user-2', workspaceId: 'workspace-1' },
          ]
            .filter(
              (member) =>
                member.workspaceId === where.workspaceId &&
                member.userId !== where.userId.not,
            )
            .map((member) => ({
              ...member,
              user: {
                notificationPreference: preferences.get(member.userId) ?? null,
              },
            })),
        ),
      ),
    },
    notificationPreference: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(preferences.get(where.userId) ?? null),
      ),
      upsert: jest.fn(({ where, create, update }: any) => {
        const value = {
          ...(preferences.get(where.userId) ?? create),
          ...update,
        };
        preferences.set(where.userId, value);
        return Promise.resolve(value);
      }),
    },
    user: {
      findUnique: jest.fn(() => Promise.resolve({ name: 'Ada' })),
    },
    notification: {
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(
          notifications.filter(
            (item) =>
              item.recipientId === where.recipientId &&
              (where.isRead === undefined || item.isRead === where.isRead),
          ),
        ),
      ),
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          notifications.find(
            (item) =>
              item.id === where.id && item.recipientId === where.recipientId,
          ) ?? null,
        ),
      ),
      count: jest.fn(({ where }: any) =>
        Promise.resolve(
          notifications.filter(
            (item) =>
              item.recipientId === where.recipientId &&
              (where.isRead === undefined || item.isRead === where.isRead),
          ).length,
        ),
      ),
      create: jest.fn(),
      createMany: jest.fn((_args: any) => Promise.resolve({ count: 1 })),
      update: jest.fn(({ where, data }: any) => {
        const item = notifications.find((record) => record.id === where.id)!;
        Object.assign(item, data);
        return Promise.resolve(item);
      }),
      updateMany: jest.fn(({ where, data }: any) => {
        let count = 0;
        notifications.forEach((item) => {
          if (
            item.recipientId === where.recipientId &&
            item.isRead === where.isRead
          ) {
            Object.assign(item, data);
            count += 1;
          }
        });
        return Promise.resolve({ count });
      }),
      deleteMany: jest.fn(({ where }: any) => {
        const index = notifications.findIndex(
          (item) =>
            item.id === where.id && item.recipientId === where.recipientId,
        );
        if (index < 0) return Promise.resolve({ count: 0 });
        notifications.splice(index, 1);
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  return prisma;
}

function notification(id: string, recipientId: string) {
  return {
    id,
    recipientId,
    actorId: null,
    workspaceId: 'workspace-1',
    projectId: null,
    taskId: null,
    messageId: 'message-1',
    type: 'WORKSPACE_CHAT_MESSAGE' as const,
    eventId: 'message-1',
    title: 'New message',
    content: 'Ada sent a message',
    link: '/workspaces/workspace-1/chat',
    isRead: false,
    createdAt: now,
    readAt: null as Date | null,
  };
}
