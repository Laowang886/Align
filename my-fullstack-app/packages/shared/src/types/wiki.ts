export interface WikiDocument {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  content: string;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWikiDocumentInput {
  title: string;
  content: string;
}

export interface UpdateWikiDocumentInput {
  title?: string;
  content?: string;
}
