import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProjectsService } from '../src/projects/projects.service';
import { WikiDocumentsService } from '../src/wiki/wiki-documents.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';

describe('Wiki documents (database)', () => {
  let prisma: PrismaService;
  let workspaces: WorkspacesService;
  let projects: ProjectsService;
  let wiki: WikiDocumentsService;
  const userIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    workspaces = new WorkspacesService(prisma);
    projects = new ProjectsService(prisma);
    wiki = new WikiDocumentsService(prisma);
  });

  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length === 0) return;
    await prisma.workspace.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  afterAll(async () => prisma.$disconnect());

  async function createUser(label: string) {
    const id = randomUUID();
    userIds.push(id);
    return prisma.user.create({
      data: {
        id,
        email: `${label}-${id}@wiki.example.test`,
        name: label,
        passwordHash: 'not-a-login-account',
      },
    });
  }

  it('persists project wiki pages and allows member edits', async () => {
    const owner = await createUser('Owner');
    const member = await createUser('Member');
    const workspace = await workspaces.create(owner.id, {
      name: 'Wiki Workspace',
      slug: `wiki-${randomUUID()}`,
    });
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: member.id, role: 'MEMBER' },
    });
    const project = await projects.create(owner.id, workspace.id, {
      name: 'Website',
      key: 'WEB',
      color: '#6366f1',
    });
    const document = await wiki.create(member.id, workspace.id, project.id, {
      title: 'Architecture',
      content: '# System',
    });

    const updated = await wiki.update(
      member.id,
      workspace.id,
      project.id,
      document.id,
      { content: '# Updated system' },
    );
    const listed = await wiki.list(member.id, workspace.id, project.id);

    expect(updated.content).toBe('# Updated system');
    expect(updated.updatedById).toBe(member.id);
    expect(listed).toEqual([expect.objectContaining({ id: document.id })]);

    await wiki.delete(member.id, workspace.id, project.id, document.id);

    await expect(wiki.list(member.id, workspace.id, project.id)).resolves.toEqual(
      [],
    );
    await expect(
      prisma.wikiDocument.findUnique({ where: { id: document.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.wikiDocument.count({
        where: {
          OR: [
            { workspaceId: workspace.id },
            { projectId: project.id },
            { createdById: member.id },
            { updatedById: member.id },
          ],
        },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.workspace.findUnique({ where: { id: workspace.id } }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.project.findUnique({ where: { id: project.id } }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.user.findUnique({ where: { id: member.id } }),
    ).resolves.not.toBeNull();
  });

  it('does not expose projects outside the member workspace', async () => {
    const first = await createUser('First');
    const second = await createUser('Second');
    const firstWorkspace = await workspaces.create(first.id, {
      name: 'First Workspace',
      slug: `first-wiki-${randomUUID()}`,
    });
    const secondWorkspace = await workspaces.create(second.id, {
      name: 'Second Workspace',
      slug: `second-wiki-${randomUUID()}`,
    });
    const project = await projects.create(second.id, secondWorkspace.id, {
      name: 'Private Project',
      key: 'PRIV',
      color: '#6366f1',
    });

    await expect(
      wiki.list(first.id, firstWorkspace.id, project.id),
    ).rejects.toMatchObject({ status: 404 });
  });
});
