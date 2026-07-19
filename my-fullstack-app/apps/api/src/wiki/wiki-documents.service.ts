import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  CreateWikiDocumentInput,
  UpdateWikiDocumentInput,
  WikiDocument,
  WorkspaceRole,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { assertWorkspacePermission } from '../workspaces/workspace.permissions';
import { ActivityService } from '../dashboard/activity.service';

@Injectable()
export class WikiDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activity?: ActivityService,
  ) {}

  async list(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<WikiDocument[]> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const documents = await this.prisma.wikiDocument.findMany({
      where: { workspaceId, projectId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'asc' }],
    });
    return documents.map(toWikiDocument);
  }

  async create(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: CreateWikiDocumentInput,
  ): Promise<WikiDocument> {
    const role = await this.assertProjectAccess(userId, workspaceId, projectId);
    assertWorkspacePermission(role, 'create_wiki_document');
    const document = await this.prisma.wikiDocument.create({
      data: {
        workspaceId,
        projectId,
        title: input.title,
        content: input.content,
        createdById: userId,
        updatedById: userId,
      },
    });
    await this.activity?.record({
      workspaceId,
      actorId: userId,
      projectId,
      action: 'created wiki document',
      resourceType: 'WIKI_DOCUMENT',
      resourceId: document.id,
      summary: document.title,
    });
    return toWikiDocument(document);
  }

  async update(
    userId: string,
    workspaceId: string,
    projectId: string,
    documentId: string,
    input: UpdateWikiDocumentInput,
  ): Promise<WikiDocument> {
    const role = await this.assertProjectAccess(userId, workspaceId, projectId);
    assertWorkspacePermission(role, 'edit_wiki_document');
    const existing = await this.prisma.wikiDocument.findFirst({
      where: { id: documentId, workspaceId, projectId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Wiki document not found');

    const document = await this.prisma.wikiDocument.update({
      where: { id: documentId },
      data: { ...input, updatedById: userId },
    });
    await this.activity?.record({
      workspaceId,
      actorId: userId,
      projectId,
      action: 'updated wiki document',
      resourceType: 'WIKI_DOCUMENT',
      resourceId: document.id,
      summary: document.title,
    });
    return toWikiDocument(document);
  }

  async delete(
    userId: string,
    workspaceId: string,
    projectId: string,
    documentId: string,
  ): Promise<void> {
    const role = await this.assertProjectAccess(userId, workspaceId, projectId);
    assertWorkspacePermission(role, 'edit_wiki_document');
    const existing = await this.prisma.wikiDocument.findFirst({
      where: { id: documentId, workspaceId, projectId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Wiki document not found');
    await this.prisma.wikiDocument.delete({ where: { id: documentId } });
  }

  private async assertProjectAccess(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<WorkspaceRole> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Workspace not found');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return membership.role;
  }
}

function toWikiDocument(document: {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  content: string;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
}): WikiDocument {
  return {
    ...document,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}
