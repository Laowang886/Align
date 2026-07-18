import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceChatService } from './workspace-chat.service';

const now = new Date('2026-07-17T12:00:00.000Z');

describe('WorkspaceChatService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects non-members when creating a conversation', async () => {
    const prisma = createPrismaMock({
      membership: null,
    });
    const { service } = createService(prisma);

    await expect(
      service.createConversation('user-1', 'workspace-1', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workspaceChatConversation.create).not.toHaveBeenCalled();
  });

  it('creates an entire workspace conversation for a workspace member', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.createConversation('user-1', 'workspace-1', {});

    expect(prisma.workspaceChatConversation.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        workspaceId: 'workspace-1',
        projectId: null,
      },
    });
  });

  it('rejects projects outside the workspace', async () => {
    const prisma = createPrismaMock({
      project: null,
    });
    const { service } = createService(prisma);

    await expect(
      service.createConversation('user-1', 'workspace-1', {
        projectId: 'project-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only lists the current user conversations', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.listConversations('user-1', 'workspace-1');

    expect(prisma.workspaceChatConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          deletedAt: null,
        },
      }),
    );
  });

  it('does not return deleted conversations in the list query', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.listConversations('user-1', 'workspace-1');

    expect(prisma.workspaceChatConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      }),
    );
  });

  it('does not read another user conversation', async () => {
    const prisma = createPrismaMock({
      conversation: null,
    });
    const { service } = createService(prisma);

    await expect(
      service.getConversation('user-1', 'workspace-1', 'conversation-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workspaceChatConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'conversation-1',
          workspaceId: 'workspace-1',
          userId: 'user-1',
          deletedAt: null,
        },
      }),
    );
  });

  it('soft deletes conversations with deletedAt and purgeAt', async () => {
    const prisma = createPrismaMock({
      updateManyCount: 1,
    });
    const { service } = createService(prisma);

    await service.deleteConversation('user-1', 'workspace-1', 'conversation-1');

    expect(prisma.workspaceChatConversation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'conversation-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        purgeAt: new Date('2026-08-16T12:00:00.000Z'),
      },
    });
  });

  it('only saves user messages to the current user conversation', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.createUserMessage('user-1', 'workspace-1', 'conversation-1', {
      content: 'Ship it',
    });

    expect(prisma.workspaceChatConversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conversation-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    expect(prisma.workspaceChatMessage.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conversation-1',
        role: 'USER',
        content: 'Ship it',
      },
    });
  });
});

type MembershipResult = { id: string } | null;
type ProjectResult = { id: string } | null;
type ConversationResult = { id: string; projectId?: string | null } | null;
type UpdateManyResult = { count: number };

type WorkspaceChatPrismaMock = {
  workspaceMember: {
    findUnique: jest.Mock<Promise<MembershipResult>>;
  };
  project: {
    findFirst: jest.Mock<Promise<ProjectResult>>;
  };
  workspaceChatConversation: {
    create: jest.Mock<Promise<ConversationResult>>;
    findMany: jest.Mock<Promise<ConversationResult[]>>;
    findFirst: jest.Mock<Promise<ConversationResult>>;
    updateMany: jest.Mock<Promise<UpdateManyResult>>;
    update: jest.Mock<Promise<ConversationResult>>;
  };
  workspaceChatMessage: {
    create: jest.Mock<Promise<ConversationResult>>;
  };
  $transaction: jest.Mock<Promise<unknown>, [TransactionInput]>;
};

type TransactionInput =
  | Promise<unknown>[]
  | ((tx: WorkspaceChatPrismaMock) => Promise<unknown>);

type PrismaMockOptions = {
  membership?: MembershipResult;
  project?: ProjectResult;
  conversation?: ConversationResult;
  updateManyCount?: number;
};

function createPrismaMock(
  options: PrismaMockOptions = {},
): PrismaService & WorkspaceChatPrismaMock {
  const membership = Object.hasOwn(options, 'membership')
    ? options.membership
    : { id: 'm1' };
  const project = Object.hasOwn(options, 'project')
    ? options.project
    : { id: 'p1' };
  const conversation = Object.hasOwn(options, 'conversation')
    ? options.conversation
    : { id: 'conversation-1', projectId: null };
  const createdMessages = [{ id: 'message-1' }, { id: 'message-2' }];

  const mock: WorkspaceChatPrismaMock = {
    workspaceMember: {
      findUnique: jest.fn().mockResolvedValue(membership),
    },
    project: {
      findFirst: jest.fn().mockResolvedValue(project),
    },
    workspaceChatConversation: {
      create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'conversation-1' }]),
      findFirst: jest.fn().mockResolvedValue(conversation),
      updateMany: jest.fn().mockResolvedValue({
        count: options.updateManyCount ?? 1,
      }),
      update: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
    },
    workspaceChatMessage: {
      create: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(createdMessages.shift() ?? { id: 'message-extra' }),
        ),
    },
    $transaction: jest.fn(async (input: TransactionInput) => {
      if (Array.isArray(input)) {
        return Promise.all(input);
      }

      return input(mock);
    }),
  };

  return mock as PrismaService & WorkspaceChatPrismaMock;
}

function createService(prisma: PrismaService & WorkspaceChatPrismaMock): {
  service: WorkspaceChatService;
} {
  return {
    service: new WorkspaceChatService(prisma),
  };
}
