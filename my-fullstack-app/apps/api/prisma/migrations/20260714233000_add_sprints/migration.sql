DO $$ BEGIN
    CREATE TYPE "SprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Sprint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL DEFAULT '',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- Upgrade the earlier development-only Sprint draft in place when present.
UPDATE "Sprint" SET "goal" = '' WHERE "goal" IS NULL;
ALTER TABLE "Sprint"
    ALTER COLUMN "goal" SET DEFAULT '',
    ALTER COLUMN "goal" SET NOT NULL,
    ALTER COLUMN "startDate" TYPE DATE USING "startDate"::date,
    ALTER COLUMN "endDate" TYPE DATE USING "endDate"::date;

CREATE INDEX IF NOT EXISTS "Sprint_projectId_createdAt_idx" ON "Sprint"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Sprint_projectId_status_idx" ON "Sprint"("projectId", "status");

-- Prisma cannot currently express a partial unique index in schema.prisma.
CREATE UNIQUE INDEX IF NOT EXISTS "Sprint_one_active_per_project_key"
ON "Sprint"("projectId") WHERE "status" = 'ACTIVE';

DO $$ BEGIN
    ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
