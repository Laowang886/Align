CREATE TABLE "OAuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthIdentity_provider_providerId_key"
ON "OAuthIdentity"("provider", "providerId");

CREATE UNIQUE INDEX "OAuthIdentity_userId_provider_key"
ON "OAuthIdentity"("userId", "provider");

CREATE INDEX "OAuthIdentity_userId_idx" ON "OAuthIdentity"("userId");

ALTER TABLE "OAuthIdentity"
ADD CONSTRAINT "OAuthIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OAuthIdentity" ("id", "userId", "provider", "providerId")
SELECT md5(random()::text || clock_timestamp()::text), "id", "provider", "providerId"
FROM "User"
WHERE "provider" IS NOT NULL AND "providerId" IS NOT NULL
ON CONFLICT ("provider", "providerId") DO NOTHING;
