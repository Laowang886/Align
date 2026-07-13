-- Add authentication credentials without altering existing user identities.
-- Existing rows must receive a temporary unusable hash before the column becomes required.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "User"
SET "passwordHash" = '$2b$12$invalidlegacyaccountplaceholder000000000000000000000000000'
WHERE "passwordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
