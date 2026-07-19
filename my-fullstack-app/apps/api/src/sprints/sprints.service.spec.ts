import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { SprintsService } from './sprints.service';

const sprintRecord = {
  id: 'sprint-1',
  projectId: 'project-1',
  name: 'Sprint 1',
  goal: 'Ship persistence',
  startDate: new Date('2026-07-14T00:00:00.000Z'),
  endDate: new Date('2026-07-28T00:00:00.000Z'),
  status: 'PLANNED' as const,
  createdAt: new Date('2026-07-14T12:00:00.000Z'),
  updatedAt: new Date('2026-07-14T12:00:00.000Z'),
};

function createPrisma(role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'ADMIN') {
  return {
    workspaceMember: {
      findUnique: jest.fn().mockResolvedValue({ role }),
    },
    project: {
      findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
    },
    sprint: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(sprintRecord),
      findFirst: jest.fn().mockResolvedValue(sprintRecord),
      update: jest
        .fn()
        .mockResolvedValue({ ...sprintRecord, status: 'ACTIVE' }),
    },
  };
}

function createService(prisma: ReturnType<typeof createPrisma>) {
  return new SprintsService(prisma as unknown as PrismaService);
}

describe('SprintsService', () => {
  it('creates a planned sprint for an admin and serializes dates', async () => {
    const prisma = createPrisma();
    const sprint = await createService(prisma).create(
      'user-1',
      'workspace-1',
      'project-1',
      {
        name: 'Sprint 1',
        goal: 'Ship persistence',
        startDate: '2026-07-14',
        endDate: '2026-07-28',
      },
    );

    expect(sprint.startDate).toBe('2026-07-14');
    expect(prisma.sprint.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        name: 'Sprint 1',
        goal: 'Ship persistence',
        startDate: new Date('2026-07-14T00:00:00.000Z'),
        endDate: new Date('2026-07-28T00:00:00.000Z'),
      },
    });
  });

  it('prevents members from managing sprints', async () => {
    const prisma = createPrisma('MEMBER');
    await expect(
      createService(prisma).create('user-1', 'workspace-1', 'project-1', {
        name: 'Sprint 1',
        startDate: '2026-07-14',
        endDate: '2026-07-28',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.sprint.create).not.toHaveBeenCalled();
  });

  it('starts a planned sprint when no other sprint is active', async () => {
    const prisma = createPrisma();
    prisma.sprint.findFirst
      .mockResolvedValueOnce(sprintRecord)
      .mockResolvedValueOnce(null);

    const sprint = await createService(prisma).updateStatus(
      'user-1',
      'workspace-1',
      'project-1',
      'sprint-1',
      { status: 'ACTIVE' },
    );

    expect(sprint.status).toBe('ACTIVE');
    expect(prisma.sprint.update).toHaveBeenCalledWith({
      where: { id: 'sprint-1' },
      data: { status: 'ACTIVE' },
    });
  });

  it('rejects a second active sprint', async () => {
    const prisma = createPrisma();
    prisma.sprint.findFirst
      .mockResolvedValueOnce(sprintRecord)
      .mockResolvedValueOnce({ id: 'sprint-2' });

    await expect(
      createService(prisma).updateStatus(
        'user-1',
        'workspace-1',
        'project-1',
        'sprint-1',
        { status: 'ACTIVE' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('enforces forward-only status transitions', async () => {
    const prisma = createPrisma();
    await expect(
      createService(prisma).updateStatus(
        'user-1',
        'workspace-1',
        'project-1',
        'sprint-1',
        { status: 'COMPLETED' },
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
