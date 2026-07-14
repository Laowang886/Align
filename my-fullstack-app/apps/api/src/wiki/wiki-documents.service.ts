import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateWikiDocumentInput,
  UpdateWikiDocumentInput,
  WikiDocument,
  WorkspaceRole,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { assertWorkspacePermission } from '../workspaces/workspace.permissions';

@Injectable()
export class WikiDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return toWikiDocument(document);
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
