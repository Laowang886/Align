import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { normalizeSlug, WorkspacesService } from './workspaces.service';

describe('WorkspacesService foundation', () => {
  type CreateArguments = {
    data: {
      name: string;
      slug: string;
      description: string | null;
      ownerId: string;
      members: { create: { userId: string; role: string } };
    };
  };
  let capturedCreate: CreateArguments | null = null;
  const workspaceRecord = {
    id: 'workspace-1',
    name: 'Format Weaver HQ',
    slug: 'format-weaver-hq',
    description: 'Product team',
    ownerId: 'user-1',
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    _count: { members: 1, projects: 0 },
  };
  const create = jest.fn((arguments_: CreateArguments) => {
    capturedCreate = arguments_;
    return Promise.resolve(workspaceRecord);
  });
  const transactionClient = { workspace: { create } };
  const transaction = jest.fn(
    (operation: (client: typeof transactionClient) => unknown) =>
      operation(transactionClient),
  );
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const service = new WorkspacesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCreate = null;
  });

  it('creates the owner membership in the same transaction as the workspace', async () => {
    await service.create('user-1', {
      name: ' Format Weaver HQ ',
      description: ' Product team ',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(capturedCreate?.data).toEqual({
      name: 'Format Weaver HQ',
      slug: 'format-weaver-hq',
      description: 'Product team',
      ownerId: 'user-1',
      members: { create: { userId: 'user-1', role: 'OWNER' } },
    });
  });

  it('never accepts ownerId from workspace input', async () => {
    const forgedInput = {
      name: 'Secure Workspace',
      slug: 'secure-workspace',
      ownerId: 'attacker-controlled-id',
    };

    await service.create('authenticated-user-id', forgedInput);

    expect(capturedCreate?.data.ownerId).toBe('authenticated-user-id');
  });

  it('maps the database slug constraint to a conflict', async () => {
    create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create('user-1', { name: 'Existing', slug: 'existing' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('generates stable URL-safe slugs', () => {
    expect(normalizeSlug('  Format Weaver HQ!  ')).toBe('format-weaver-hq');
  });
});
