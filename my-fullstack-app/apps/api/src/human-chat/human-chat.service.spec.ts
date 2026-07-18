import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HumanChatService } from './human-chat.service';

describe('HumanChatService', () => {
  it('get-or-creates the #all channel while listing channels', async () => {
    const prisma = createPrismaMock({ allChannel: null });
    const service = new HumanChatService(prisma);

    await service.listChannels('user-1', 'workspace-1');

    expect(prisma.channel.create).toHaveBeenCalledWith({
      data: { workspaceId: 'workspace-1', name: 'all' },
      include: { _count: { select: { messages: true } } },
    });
    expect(prisma.channel.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 'workspace-1' },
      orderBy: [{ name: 'asc' }],
      include: { _count: { select: { messages: true } } },
    });
  });

  it('rejects channel messages for channels outside the workspace', async () => {
    const prisma = createPrismaMock({ channel: null });
    const service = new HumanChatService(prisma);

    await expect(
      service.createChannelMessage('user-1', 'workspace-1', 'channel-2', {
        content: 'Nope',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('creates a direct message conversation only with another workspace member', async () => {
    const prisma = createPrismaMock();
    const service = new HumanChatService(prisma);

    await service.getOrCreateDirectMessage('user-2', 'workspace-1', 'member-1');

    expect(prisma.directMessageConversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId_firstUserId_secondUserId: {
            workspaceId: 'workspace-1',
            firstUserId: 'user-1',
            secondUserId: 'user-2',
          },
        },
        create: {
          workspaceId: 'workspace-1',
          firstUserId: 'user-1',
          secondUserId: 'user-2',
        },
      }),
    );
  });

  it('rejects non-participants reading direct messages', async () => {
    const prisma = createPrismaMock({ directConversation: null });
    const service = new HumanChatService(prisma);

    await expect(
      service.listDirectMessageMessages(
        'user-3',
        'workspace-1',
        'conversation-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.directMessage.findMany).not.toHaveBeenCalled();
  });

  it('saves direct messages with the current user as author', async () => {
    const prisma = createPrismaMock();
    const service = new HumanChatService(prisma);

    await service.createDirectMessage('user-1', 'workspace-1', 'conversation-1', {
      content: 'Hello',
    });

    expect(prisma.directMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          conversationId: 'conversation-1',
          authorId: 'user-1',
          content: 'Hello',
        },
      }),
    );
  });
});

type PrismaMockOptions = {
  allChannel?: { id: string; name: string; workspaceId: string } | null;
  channel?: { id: string } | null;
  directConversation?: { id: string } | null;
};

type HumanChatPrismaMock = ReturnType<typeof createRawPrismaMock>;

function createPrismaMock(
  options: PrismaMockOptions = {},
): PrismaService & HumanChatPrismaMock {
  return createRawPrismaMock(options) as PrismaService & HumanChatPrismaMock;
}

function createRawPrismaMock(options: PrismaMockOptions) {
  const allChannel = Object.hasOwn(options, 'allChannel')
    ? options.allChannel
    : { id: 'channel-all', name: 'all', workspaceId: 'workspace-1' };
  const channel = Object.hasOwn(options, 'channel')
    ? options.channel
    : { id: 'channel-1' };
  const directConversation = Object.hasOwn(options, 'directConversation')
    ? options.directConversation
    : { id: 'conversation-1' };
  const mock = {
    workspaceMember: {
      findUnique: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      findFirst: jest.fn().mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          name: 'Ava',
          email: 'ava@example.com',
          avatarUrl: null,
        },
      }),
    },
    channel: {
      findFirst: jest.fn((args: { where?: { name?: string } }) =>
        Promise.resolve(args.where?.name === 'all' ? allChannel : channel),
      ),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: 'channel-all',
        name: 'all',
        workspaceId: 'workspace-1',
      }),
    },
    message: {
      create: jest.fn().mockResolvedValue({ id: 'message-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    directMessageConversation: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(directConversation),
      upsert: jest.fn().mockResolvedValue({
        id: 'conversation-1',
        workspaceId: 'workspace-1',
        firstUserId: 'user-1',
        secondUserId: 'user-2',
        updatedAt: new Date('2026-07-18T12:00:00.000Z'),
        firstUser: {
          id: 'user-1',
          name: 'Ava',
          email: 'ava@example.com',
          avatarUrl: null,
        },
        secondUser: {
          id: 'user-2',
          name: 'Ben',
          email: 'ben@example.com',
          avatarUrl: null,
        },
      }),
      update: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
    },
    directMessage: {
      create: jest.fn().mockResolvedValue({ id: 'direct-message-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn((input: Promise<unknown>[]) => Promise.all(input)),
  };

  return mock;
}
