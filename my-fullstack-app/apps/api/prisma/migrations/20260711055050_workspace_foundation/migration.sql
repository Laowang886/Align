-- Workspace foundation migration.
-- The physical Team/TeamMember names are retained for backward compatibility.

CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Remove foreign keys whose delete behaviour changes or whose columns move.
ALTER TABLE "Board" DROP CONSTRAINT "Board_teamId_fkey";
ALTER TABLE "Channel" DROP CONSTRAINT "Channel_teamId_fkey";
ALTER TABLE "Column" DROP CONSTRAINT "Column_boardId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT "Message_channelId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT "Task_columnId_fkey";
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- Add Workspace fields as nullable/defaulted first so existing rows can be backfilled.
ALTER TABLE "Team"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "TeamMember"
  ADD COLUMN "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "role_new" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER';

UPDATE "TeamMember"
SET "role_new" = CASE LOWER("role")
  WHEN 'owner' THEN 'OWNER'::"WorkspaceRole"
  WHEN 'admin' THEN 'ADMIN'::"WorkspaceRole"
  ELSE 'MEMBER'::"WorkspaceRole"
END;

ALTER TABLE "TeamMember" DROP COLUMN "role";
ALTER TABLE "TeamMember" RENAME COLUMN "role_new" TO "role";

-- Retain one existing owner per Workspace and demote duplicate legacy owners.
WITH ranked_owners AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "teamId" ORDER BY "joinedAt", "id") AS rank
  FROM "TeamMember"
  WHERE "role" = 'OWNER'
)
UPDATE "TeamMember" AS member
SET "role" = 'ADMIN'
FROM ranked_owners
WHERE member."id" = ranked_owners."id" AND ranked_owners.rank > 1;

-- Promote the earliest member when a legacy Workspace has no owner role.
WITH first_members AS (
  SELECT "id", "teamId", ROW_NUMBER() OVER (PARTITION BY "teamId" ORDER BY "joinedAt", "id") AS rank
  FROM "TeamMember"
)
UPDATE "TeamMember" AS member
SET "role" = 'OWNER'
FROM first_members
WHERE member."id" = first_members."id"
  AND first_members.rank = 1
  AND NOT EXISTS (
    SELECT 1 FROM "TeamMember" AS owner_member
    WHERE owner_member."teamId" = member."teamId" AND owner_member."role" = 'OWNER'
  );

UPDATE "Team" AS workspace
SET "ownerId" = owner_member."userId"
FROM "TeamMember" AS owner_member
WHERE owner_member."teamId" = workspace."id" AND owner_member."role" = 'OWNER';

-- Abort instead of inventing ownership when an existing Team has no members.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Team" WHERE "ownerId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate a Team without members; add a member before applying workspace_foundation';
  END IF;
END $$;

ALTER TABLE "Team" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Board" ADD COLUMN "projectId" TEXT;

-- Preserve every legacy Board by placing it in a generated Project.
WITH legacy_projects AS (
  SELECT
    board."id" AS board_id,
    'legacy-project-' || board."id" AS project_id,
    board."teamId" AS workspace_id,
    board."title" AS project_name,
    'LEGACY-' || ROW_NUMBER() OVER (PARTITION BY board."teamId" ORDER BY board."id") AS project_key
  FROM "Board" AS board
)
INSERT INTO "Project" ("id", "workspaceId", "name", "key", "updatedAt")
SELECT project_id, workspace_id, project_name, project_key, CURRENT_TIMESTAMP
FROM legacy_projects;

UPDATE "Board"
SET "projectId" = 'legacy-project-' || "id";

ALTER TABLE "Board" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Board" DROP COLUMN "teamId";

CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
CREATE UNIQUE INDEX "Project_workspaceId_key_key" ON "Project"("workspaceId", "key");
CREATE INDEX "Board_projectId_idx" ON "Board"("projectId");
CREATE INDEX "Channel_teamId_idx" ON "Channel"("teamId");
CREATE INDEX "Column_boardId_idx" ON "Column"("boardId");
CREATE INDEX "Message_channelId_idx" ON "Message"("channelId");
CREATE INDEX "Message_authorId_idx" ON "Message"("authorId");
CREATE INDEX "Task_columnId_idx" ON "Task"("columnId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");
CREATE INDEX "TeamMember_teamId_role_idx" ON "TeamMember"("teamId", "role");

ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Board" ADD CONSTRAINT "Board_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Column" ADD CONSTRAINT "Column_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_columnId_fkey"
  FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- @updatedAt is managed by Prisma after inserts.
ALTER TABLE "Team" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "updatedAt" DROP DEFAULT;
