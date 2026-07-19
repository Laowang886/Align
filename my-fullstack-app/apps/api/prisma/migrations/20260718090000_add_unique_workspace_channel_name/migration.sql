WITH duplicate_channels AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "teamId", "name"
      ORDER BY "id"
    ) AS "keeperId",
    ROW_NUMBER() OVER (
      PARTITION BY "teamId", "name"
      ORDER BY "id"
    ) AS "duplicateRank"
  FROM "Channel"
)
UPDATE "Message"
SET "channelId" = duplicate_channels."keeperId"
FROM duplicate_channels
WHERE "Message"."channelId" = duplicate_channels."id"
  AND duplicate_channels."duplicateRank" > 1;

WITH duplicate_channels AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "teamId", "name"
      ORDER BY "id"
    ) AS "duplicateRank"
  FROM "Channel"
)
DELETE FROM "Channel"
USING duplicate_channels
WHERE "Channel"."id" = duplicate_channels."id"
  AND duplicate_channels."duplicateRank" > 1;

CREATE UNIQUE INDEX "Channel_teamId_name_key" ON "Channel"("teamId", "name");
