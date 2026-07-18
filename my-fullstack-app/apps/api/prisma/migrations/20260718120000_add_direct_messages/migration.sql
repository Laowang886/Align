-- CreateTable
CREATE TABLE "DirectMessageConversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "firstUserId" TEXT NOT NULL,
    "secondUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessageConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageConversation_workspaceId_firstUserId_second_key" ON "DirectMessageConversation"("workspaceId", "firstUserId", "secondUserId");

-- CreateIndex
CREATE INDEX "DirectMessageConversation_workspaceId_idx" ON "DirectMessageConversation"("workspaceId");

-- CreateIndex
CREATE INDEX "DirectMessageConversation_firstUserId_idx" ON "DirectMessageConversation"("firstUserId");

-- CreateIndex
CREATE INDEX "DirectMessageConversation_secondUserId_idx" ON "DirectMessageConversation"("secondUserId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "DirectMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_authorId_idx" ON "DirectMessage"("authorId");

-- AddForeignKey
ALTER TABLE "DirectMessageConversation" ADD CONSTRAINT "DirectMessageConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageConversation" ADD CONSTRAINT "DirectMessageConversation_firstUserId_fkey" FOREIGN KEY ("firstUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageConversation" ADD CONSTRAINT "DirectMessageConversation_secondUserId_fkey" FOREIGN KEY ("secondUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DirectMessageConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
