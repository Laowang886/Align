import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';

describe('Workspace foundation (database)', () => {
  let prisma: PrismaService;
  let workspaces: WorkspacesService;
  const userIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    workspaces = new WorkspacesService(prisma);
    await prisma.workspace.deleteMany({
      where: { owner: { email: { endsWith: '@example.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@example.test' } },
    });
  });

  afterEach(async () => {
    if (userIds.length > 0) {
      const ids = userIds.splice(0);
      await prisma.workspace.deleteMany({ where: { ownerId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createUser(label: string) {
    const id = randomUUID();
    userIds.push(id);
    return prisma.user.create({
      data: {
        id,
        email: `${label}-${id}@example.test`,
        name: label,
        passwordHash: 'not-a-login-account',
      },
    });
  }

  it('atomically creates an OWNER membership', async () => {
    const user = await createUser('Owner');
    const slug = `workspace-${randomUUID()}`;

    const workspace = await workspaces.create(user.id, {
      name: 'Workspace',
      slug,
    });
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
      },
    });

    expect(workspace.ownerId).toBe(user.id);
    expect(membership).toEqual(
      expect.objectContaining({ userId: user.id, role: 'OWNER' }),
    );
  });

  it('enforces unique workspace slugs', async () => {
    const firstOwner = await createUser('First Owner');
    const secondOwner = await createUser('Second Owner');
    const slug = `unique-${randomUUID()}`;
    await workspaces.create(firstOwner.id, { name: 'First', slug });

    await expect(
      workspaces.create(secondOwner.id, { name: 'Second', slug }),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('prevents duplicate membership for the same user and workspace', async () => {
    const user = await createUser('Member');
    const workspace = await workspaces.create(user.id, {
      name: 'Membership Workspace',
      slug: `membership-${randomUUID()}`,
    });

    await expect(
      prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: 'MEMBER' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('isolates workspace queries by membership', async () => {
    const firstUser = await createUser('First Member');
    const secondUser = await createUser('Second Member');
    const first = await workspaces.create(firstUser.id, {
      name: 'First Workspace',
      slug: `first-${randomUUID()}`,
    });
    await workspaces.create(secondUser.id, {
      name: 'Second Workspace',
      slug: `second-${randomUUID()}`,
    });

    const visible = await prisma.workspace.findMany({
      where: { members: { some: { userId: firstUser.id } } },
    });

    expect(visible.map((workspace) => workspace.id)).toEqual([first.id]);
  });
});
