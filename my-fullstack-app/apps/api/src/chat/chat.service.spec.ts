import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { parseUpdateChatChannelNoticeDto } from './dto/chat.dto';

describe('ChatService', () => {
  function createPrisma() {
    const users = new Map([
      [
        'user-1',
        {
          id: 'user-1',
          name: 'Ada',
          email: 'ada@example.com',
          avatarUrl: null,
        },
      ],
      [
        'user-3',
        {
          id: 'user-3',
          name: 'Grace',
          email: 'grace@example.com',
          avatarUrl: null,
        },
      ],
      [
        'user-4',
        {
          id: 'user-4',
          name: 'Margaret',
          email: 'margaret@example.com',
          avatarUrl: null,
        },
      ],
      [
        'user-2',
        {
          id: 'user-2',
          name: 'Lin',
          email: 'lin@example.com',
          avatarUrl: null,
        },
      ],
    ]);
    const members = [
      { id: 'member-1', userId: 'user-1', workspaceId: 'workspace-1' },
      { id: 'member-2', userId: 'user-2', workspaceId: 'workspace-1' },
      { id: 'member-3', userId: 'user-3', workspaceId: 'workspace-1' },
      { id: 'member-3', userId: 'user-1', workspaceId: 'workspace-2' },
    ];
    const channels: Array<{
      id: string;
      workspaceId: string;
      name: string;
      notice: string | null;
    }> = [];
    const messages: Array<{
      id: string;
      channelId: string;
      authorId: string;
      content: string;
      createdAt: Date;
    }> = [];

    const prisma = {
      channels,
      messages,
      $queryRaw: jest.fn(() => Promise.resolve([])),
      $transaction: jest.fn((callback) => callback(prisma)),
      workspaceMember: {
        findUnique: jest.fn(({ where }) => {
          const match = members.find(
            (member) =>
              member.userId === where.userId_workspaceId.userId &&
              member.workspaceId === where.userId_workspaceId.workspaceId,
          );
          if (!match) return Promise.resolve(null);
          return Promise.resolve({ ...match, user: users.get(match.userId) });
        }),
      },
      channel: {
        findFirst: jest.fn(({ where }) =>
          Promise.resolve(
            channels.find(
              (channel) =>
                (!where.id || channel.id === where.id) &&
                channel.workspaceId === where.workspaceId &&
                (!where.name || channel.name === where.name),
            ) ?? null,
          ),
        ),
        findMany: jest.fn(({ where }) =>
          Promise.resolve(
            channels
              .filter(
                (channel) =>
                  channel.workspaceId === where.workspaceId &&
                  !channel.name.startsWith('dm:'),
              )
              .sort((first, second) => first.name.localeCompare(second.name)),
          ),
        ),
        create: jest.fn(({ data }) => {
          const channel = {
            id: `channel-${channels.length + 1}`,
            notice: null,
            ...data,
          };
          channels.push(channel);
          return Promise.resolve(channel);
        }),
        delete: jest.fn(({ where }) => {
          const index = channels.findIndex(
            (channel) => channel.id === where.id,
          );
          const [channel] = channels.splice(index, 1);
          for (let index = messages.length - 1; index >= 0; index -= 1) {
            if (messages[index].channelId === where.id)
              messages.splice(index, 1);
          }
          return Promise.resolve(channel);
        }),
        update: jest.fn(({ where, data }) => {
          const index = channels.findIndex((item) => item.id === where.id);
          const channel = channels[index];
          if (!channel) return Promise.resolve(null);
          if (
            data.name &&
            channels.some(
              (item) =>
                item.id !== channel.id &&
                item.workspaceId === channel.workspaceId &&
                item.name === data.name,
            )
          ) {
            return Promise.reject({ code: 'P2002' });
          }
          const updated = { ...channel, ...data };
          channels.splice(index, 1, updated);
          return Promise.resolve(updated);
        }),
      },
      message: {
        findMany: jest.fn(({ where }) =>
          Promise.resolve(
            messages
              .filter((message) => message.channelId === where.channelId)
              .map((message) => ({
                ...message,
                author: users.get(message.authorId),
              })),
          ),
        ),
        create: jest.fn(({ data }) => {
          const message = {
            id: `message-${messages.length + 1}`,
            createdAt: new Date('2026-07-18T12:00:00.000Z'),
            ...data,
          };
          messages.push(message);
          return Promise.resolve({
            ...message,
            author: users.get(data.authorId),
          });
        }),
        deleteMany: jest.fn(({ where }) => {
          const initialLength = messages.length;
          for (let index = messages.length - 1; index >= 0; index -= 1) {
            if (messages[index].channelId === where.channelId) {
              messages.splice(index, 1);
            }
          }
          return Promise.resolve({ count: initialLength - messages.length });
        }),
      },
    };
    return prisma;
  }

  it('does not create a default all channel when chat state is loaded', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const state = await service.getWorkspaceChatState('user-1', 'workspace-1');

    expect(state.channels).toEqual([]);
    expect(prisma.channels).toEqual([]);
  });

  it('rejects non-members and self direct messages', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    await expect(
      service.getWorkspaceChatState('user-4', 'workspace-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getDirectConversation('user-1', 'workspace-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates, reads, and deletes custom channels with their messages', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const channel = await service.createChannel('user-1', 'workspace-1', {
      name: 'planning',
    });
    const createdMessage = await service.createChannelMessage(
      'user-1',
      'workspace-1',
      channel.id,
      { content: 'Kickoff notes' },
    );
    const state = await service.getWorkspaceChatState('user-1', 'workspace-1');
    const messages = await service.getChannelMessages(
      'user-2',
      'workspace-1',
      channel.id,
    );

    expect(state.channels).toEqual([channel]);
    expect(messages).toEqual([createdMessage]);

    await service.deleteChannel('user-1', 'workspace-1', channel.id);

    expect(prisma.channels).toEqual([]);
    expect(prisma.messages).toEqual([]);
    await expect(
      service.getChannelMessages('user-1', 'workspace-1', channel.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows all to be deleted as a public channel but keeps direct channels protected', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const all = await service.createChannel('user-1', 'workspace-1', {
      name: 'all',
    });
    const direct = await service.getDirectConversation(
      'user-1',
      'workspace-1',
      'user-2',
    );

    await service.deleteChannel('user-1', 'workspace-1', all.id);

    expect(prisma.channels.map((channel) => channel.name)).toEqual([
      direct.channel.name,
    ]);
    await expect(
      service.deleteChannel('user-1', 'workspace-1', direct.channel.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('renames custom channels without changing channel id or messages', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const channel = await service.createChannel('user-1', 'workspace-1', {
      name: 'planning',
    });
    const message = await service.createChannelMessage(
      'user-1',
      'workspace-1',
      channel.id,
      { content: 'Keep this message' },
    );

    const renamed = await service.updateChannel(
      'user-2',
      'workspace-1',
      channel.id,
      { name: 'team-updates' },
    );
    const messages = await service.getChannelMessages(
      'user-1',
      'workspace-1',
      channel.id,
    );

    expect(renamed).toEqual({
      ...channel,
      name: 'team-updates',
    });
    expect(messages).toEqual([message]);
  });

  it('allows all to be renamed but rejects direct or duplicate channel renames', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const all = await service.createChannel('user-1', 'workspace-1', {
      name: 'all',
    });
    const first = await service.createChannel('user-1', 'workspace-1', {
      name: 'planning',
    });
    const second = await service.createChannel('user-1', 'workspace-1', {
      name: 'team-updates',
    });
    const direct = await service.getDirectConversation(
      'user-1',
      'workspace-1',
      'user-2',
    );

    await expect(
      service.updateChannel('user-1', 'workspace-1', all.id, {
        name: 'general',
      }),
    ).resolves.toEqual({ ...all, name: 'general' });
    await expect(
      service.updateChannel('user-1', 'workspace-1', direct.channel.id, {
        name: 'general',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateChannel('user-1', 'workspace-1', first.id, {
        name: second.name,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates, trims, persists, and clears public channel notice without changing name or messages', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const channel = await service.createChannel('user-1', 'workspace-1', {
      name: 'planning',
    });
    const message = await service.createChannelMessage(
      'user-1',
      'workspace-1',
      channel.id,
      { content: 'Keep this message' },
    );

    const updated = await service.updateChannelNotice(
      'user-2',
      'workspace-1',
      channel.id,
      parseUpdateChatChannelNoticeDto({ notice: '  Launch at 10  ' }),
    );
    const conversation = await service.getChannelConversation(
      'user-1',
      'workspace-1',
      channel.id,
    );
    const messages = await service.getChannelMessages(
      'user-1',
      'workspace-1',
      channel.id,
    );

    expect(updated).toEqual({ ...channel, notice: 'Launch at 10' });
    expect(conversation.channel.notice).toBe('Launch at 10');
    expect(conversation.channel.name).toBe(channel.name);
    expect(messages).toEqual([message]);

    await expect(
      service.updateChannelNotice(
        'user-1',
        'workspace-1',
        channel.id,
        parseUpdateChatChannelNoticeDto({ notice: '' }),
      ),
    ).resolves.toEqual({ ...channel, notice: null });
  });

  it('rejects invalid channel notice updates', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);
    const channel = await service.createChannel('user-1', 'workspace-1', {
      name: 'planning',
    });
    const direct = await service.getDirectConversation(
      'user-1',
      'workspace-1',
      'user-2',
    );

    expect(() =>
      parseUpdateChatChannelNoticeDto({
        notice: 'Notice',
        name: 'surprise',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseUpdateChatChannelNoticeDto({ notice: 'x'.repeat(501) }),
    ).toThrow(BadRequestException);
    await expect(
      service.updateChannelNotice('user-4', 'workspace-1', channel.id, {
        notice: 'Nope',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.updateChannelNotice('user-1', 'workspace-2', channel.id, {
        notice: 'Nope',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.updateChannelNotice('user-1', 'workspace-1', direct.channel.id, {
        notice: 'Nope',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears only current public channel messages while keeping the channel metadata', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const current = await service.createChannel('user-1', 'workspace-1', {
      name: 'planning',
    });
    const other = await service.createChannel('user-1', 'workspace-1', {
      name: 'random',
    });
    const otherWorkspace = await service.createChannel('user-1', 'workspace-2', {
      name: 'planning',
    });
    await service.updateChannelNotice('user-1', 'workspace-1', current.id, {
      notice: 'Keep me',
    });
    await service.createChannelMessage('user-1', 'workspace-1', current.id, {
      content: 'Delete me',
    });
    const keptSameWorkspace = await service.createChannelMessage(
      'user-1',
      'workspace-1',
      other.id,
      { content: 'Keep same workspace' },
    );
    const keptOtherWorkspace = await service.createChannelMessage(
      'user-1',
      'workspace-2',
      otherWorkspace.id,
      { content: 'Keep other workspace' },
    );

    await service.clearChannelMessages('user-2', 'workspace-1', current.id);

    await expect(
      service.getChannelMessages('user-1', 'workspace-1', current.id),
    ).resolves.toEqual([]);
    expect(prisma.channels.find((item) => item.id === current.id)).toEqual({
      ...current,
      notice: 'Keep me',
    });
    await expect(
      service.getChannelMessages('user-1', 'workspace-1', other.id),
    ).resolves.toEqual([keptSameWorkspace]);
    await expect(
      service.getChannelMessages('user-1', 'workspace-2', otherWorkspace.id),
    ).resolves.toEqual([keptOtherWorkspace]);
    await expect(
      service.createChannelMessage('user-1', 'workspace-1', current.id, {
        content: 'New message',
      }),
    ).resolves.toMatchObject({ content: 'New message' });
  });

  it('clears direct message history for participants without deleting the conversation', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);

    const direct = await service.getDirectConversation(
      'user-1',
      'workspace-1',
      'user-2',
    );
    await service.createDirectMessage('user-1', 'workspace-1', 'user-2', {
      content: 'Delete this shared message',
    });

    await service.clearChannelMessages('user-2', 'workspace-1', direct.channel.id);

    await expect(
      service.getDirectMessages('user-1', 'workspace-1', 'user-2'),
    ).resolves.toEqual([]);
    expect(prisma.channels.find((item) => item.id === direct.channel.id)).toEqual(
      direct.channel,
    );
    await expect(
      service.createDirectMessage('user-1', 'workspace-1', 'user-2', {
        content: 'New direct message',
      }),
    ).resolves.toMatchObject({ content: 'New direct message' });
  });

  it('rejects unsafe clear history requests and allows empty public channels', async () => {
    const prisma = createPrisma();
    const service = new ChatService(prisma as never);
    const channel = await service.createChannel('user-1', 'workspace-1', {
      name: 'planning',
    });
    const direct = await service.getDirectConversation(
      'user-1',
      'workspace-1',
      'user-2',
    );

    await expect(
      service.clearChannelMessages('user-1', 'workspace-1', channel.id),
    ).resolves.toBeUndefined();
    await expect(
      service.clearChannelMessages('user-4', 'workspace-1', channel.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.clearChannelMessages('user-1', 'workspace-2', channel.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.clearChannelMessages('user-3', 'workspace-1', direct.channel.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
