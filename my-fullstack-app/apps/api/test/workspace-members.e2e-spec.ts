import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type TestUser = { id: string; token: string };

describe('Workspace members API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup() {
    await prisma.workspace.deleteMany({
      where: { owner: { email: { endsWith: '@stage4.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@stage4.test' } },
    });
  }

  async function register(label: string): Promise<TestUser> {
    const email = `${label.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}@stage4.test`;
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, name: label, password: 'valid-password' })
      .expect(201);
    const body = parseRecord(response.text);
    return {
      id: readString(asRecord(body.user).id),
      token: readString(body.accessToken),
    };
  }

  async function createWorkspace(owner: TestUser) {
    const response = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Members Workspace', slug: `members-${randomUUID()}` })
      .expect(201);
    return readString(parseRecord(response.text).id);
  }

  it('hides the member directory from non-members', async () => {
    const owner = await register('Directory Owner');
    const outsider = await register('Directory Outsider');
    const workspaceId = await createWorkspace(owner);
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
  });

  it('enforces role changes and member removal rules', async () => {
    const owner = await register('Role Owner');
    const admin = await register('Role Admin');
    const member = await register('Role Member');
    const workspaceId = await createWorkspace(owner);
    const adminMembership = await prisma.workspaceMember.create({
      data: { workspaceId, userId: admin.id, role: 'MEMBER' },
    });
    const memberMembership = await prisma.workspaceMember.create({
      data: { workspaceId, userId: member.id, role: 'MEMBER' },
    });

    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/members/${adminMembership.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/members/${memberMembership.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'ADMIN' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/members/${memberMembership.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(204);

    const ownerMembership = await prisma.workspaceMember.findUniqueOrThrow({
      where: { userId_workspaceId: { workspaceId, userId: owner.id } },
    });
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/members/${ownerMembership.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(403);
  });

  it('allows members to leave and requires owners to transfer before leaving', async () => {
    const owner = await register('Leave Owner');
    const successor = await register('Leave Successor');
    const ordinaryMember = await register('Leaving Member');
    const workspaceId = await createWorkspace(owner);
    const successorMembership = await prisma.workspaceMember.create({
      data: { workspaceId, userId: successor.id, role: 'ADMIN' },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: ordinaryMember.id, role: 'MEMBER' },
    });

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/leave`)
      .set('Authorization', `Bearer ${ordinaryMember.token}`)
      .expect(204);
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { workspaceId, userId: ordinaryMember.id },
        },
      }),
    ).toBeNull();

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/leave`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/transfer-ownership`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ memberId: successorMembership.id })
      .expect(204);

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/leave`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(204);

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    expect(workspace.ownerId).toBe(successor.id);
  });
});

function parseRecord(text: string): Record<string, unknown> {
  return asRecord(JSON.parse(text) as unknown);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object');
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected a string');
  return value;
}
