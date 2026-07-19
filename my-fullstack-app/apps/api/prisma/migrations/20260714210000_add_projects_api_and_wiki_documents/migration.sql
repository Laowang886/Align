ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#6366f1';

CREATE TABLE "WikiDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WikiDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WikiDocument_workspaceId_projectId_updatedAt_idx"
ON "WikiDocument"("workspaceId", "projectId", "updatedAt");
CREATE INDEX "WikiDocument_createdById_idx" ON "WikiDocument"("createdById");
CREATE INDEX "WikiDocument_updatedById_idx" ON "WikiDocument"("updatedById");

ALTER TABLE "WikiDocument" ADD CONSTRAINT "WikiDocument_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiDocument" ADD CONSTRAINT "WikiDocument_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiDocument" ADD CONSTRAINT "WikiDocument_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WikiDocument" ADD CONSTRAINT "WikiDocument_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
