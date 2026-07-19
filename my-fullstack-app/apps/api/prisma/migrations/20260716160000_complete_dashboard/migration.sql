-- Dashboard data fields and activity audit trail.
CREATE TYPE "TaskPriority" AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ColumnCategory" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

ALTER TABLE "Column"
  ADD COLUMN "color" TEXT NOT NULL DEFAULT 'gray',
  ADD COLUMN "category" "ColumnCategory" NOT NULL DEFAULT 'TODO';

UPDATE "Column"
SET "category" = CASE
  WHEN lower("title") LIKE '%backlog%' THEN 'BACKLOG'::"ColumnCategory"
  WHEN lower("title") LIKE '%done%' OR lower("title") LIKE '%complete%' THEN 'DONE'::"ColumnCategory"
  WHEN lower("title") LIKE '%review%' THEN 'REVIEW'::"ColumnCategory"
  WHEN lower("title") LIKE '%progress%' THEN 'IN_PROGRESS'::"ColumnCategory"
  ELSE 'TODO'::"ColumnCategory"
END;

ALTER TABLE "Task"
  ADD COLUMN "code" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "dueDate" DATE,
  ADD COLUMN "storyPoints" INTEGER,
  ADD COLUMN "sprintId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

WITH numbered AS (
  SELECT "id", row_number() OVER (PARTITION BY "columnId" ORDER BY "createdAt", "id") AS number
  FROM "Task"
)
UPDATE "Task" SET "code" = 'TASK-' || numbered.number
FROM numbered WHERE "Task"."id" = numbered."id";

CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "actorId" TEXT,
  "projectId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_sprintId_idx" ON "Task"("sprintId");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON "ActivityLog"("workspaceId", "createdAt");
CREATE INDEX "ActivityLog_projectId_createdAt_idx" ON "ActivityLog"("projectId", "createdAt");
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
