import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type AuthenticatedTestUser = { id: string; cookie: string; email: string };

describe('Workspace CRUD API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
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
      where: { owner: { email: { endsWith: '@stage2.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@stage2.test' } },
    });
  }

  async function register(label: string): Promise<AuthenticatedTestUser> {
    const emailLabel = label.toLowerCase().replace(/\s+/g, '-');
    const email = `${emailLabel}-${randomUUID()}@stage2.test`;
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, name: label, password: 'valid-password' })
      .expect(201);
    const body = parseJsonRecord(response.text);
    const user = asRecord(body.user);
    return {
      id: asString(user.id),
      cookie: readAuthCookie(response.headers['set-cookie']),
      email,
    };
  }

  async function createWorkspace(user: AuthenticatedTestUser, name: string) {
    const response = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', user.cookie)
      .send({ name, slug: `${name}-${randomUUID()}` })
      .expect(201);
    return parseJsonRecord(response.text);
  }

  it('requires authentication for the workspace list', async () => {
    await request(app.getHttpServer()).get('/workspaces').expect(401);
  });

  it('rejects unknown and mass-assignment create fields', async () => {
    const owner = await register('Validation Owner');
    await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', owner.cookie)
      .send({ name: 'Invalid Workspace', ownerId: 'forged-owner' })
      .expect(400);
  });

  it('lists only memberships and hides non-member workspace details', async () => {
    const firstOwner = await register('First Owner');
    const secondOwner = await register('Second Owner');
    const firstWorkspace = await createWorkspace(firstOwner, 'First Workspace');
    const secondWorkspace = await createWorkspace(
      secondOwner,
      'Second Workspace',
    );

    const listResponse = await request(app.getHttpServer())
      .get('/workspaces')
      .set('Cookie', firstOwner.cookie)
      .expect(200);
    const list = parseJsonArray(listResponse.text).map(asRecord);

    expect(list.map((workspace) => asString(workspace.id))).toEqual([
      asString(firstWorkspace.id),
    ]);
    await request(app.getHttpServer())
      .get(`/workspaces/${asString(secondWorkspace.id)}`)
      .set('Cookie', firstOwner.cookie)
      .expect(404);
  });

  it('enforces MEMBER, ADMIN, and OWNER permissions for update and delete', async () => {
    const owner = await register('CRUD Owner');
    const admin = await register('CRUD Admin');
    const member = await register('CRUD Member');
    const workspace = await createWorkspace(owner, 'Permissions Workspace');
    const workspaceId = asString(workspace.id);

    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId, userId: admin.id, role: 'ADMIN' },
        { workspaceId, userId: member.id, role: 'MEMBER' },
      ],
    });

    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Cookie', member.cookie)
      .send({ name: 'Member Edit' })
      .expect(403);

    const adminUpdate = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Cookie', admin.cookie)
      .send({ description: 'Updated by admin' })
      .expect(200);
    expect(asRecord(parseJsonRecord(adminUpdate.text)).description).toBe(
      'Updated by admin',
    );

    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}`)
      .set('Cookie', admin.cookie)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Cookie', owner.cookie)
      .send({ name: 'Owner Updated Workspace' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}`)
      .set('Cookie', owner.cookie)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}`)
      .set('Cookie', owner.cookie)
      .expect(404);
  });
});

function parseJsonRecord(text: string): Record<string, unknown> {
  return asRecord(JSON.parse(text) as unknown);
}

function parseJsonArray(text: string): unknown[] {
  const value = JSON.parse(text) as unknown;
  if (!Array.isArray(value)) throw new Error('Expected a JSON array');
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected a JSON object');
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected a string');
  return value;
}

function readAuthCookie(header: string[] | string | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) throw new Error('Expected an authentication cookie');
  return value.split(';', 1)[0];
}
