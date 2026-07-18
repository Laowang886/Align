-- CreateEnum
CREATE TYPE "WorkspaceChatMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "WorkspaceChatActionType" AS ENUM ('CREATE_TASK', 'UPDATE_TASK', 'MOVE_TASK', 'DELETE_TASK', 'CREATE_WIKI', 'UPDATE_WIKI', 'DELETE_WIKI', 'CREATE_SPRINT', 'START_SPRINT', 'COMPLETE_SPRINT');

-- CreateEnum
CREATE TYPE "WorkspaceChatActionStatus" AS ENUM ('PENDING_CONFIRMATION', 'CANCELLED', 'EXPIRED', 'EXECUTING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WorkspaceChatConversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "deletedAt" TIMESTAMP(3),
    "purgeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "WorkspaceChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceChatActionPlan" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "assistantMessageId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceChatActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceChatAction" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "actionType" "WorkspaceChatActionType" NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "displayData" JSONB NOT NULL,
    "status" "WorkspaceChatActionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "result" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceChatAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceChatConversation_userId_workspaceId_deletedAt_upda_idx" ON "WorkspaceChatConversation"("userId", "workspaceId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkspaceChatConversation_workspaceId_projectId_idx" ON "WorkspaceChatConversation"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "WorkspaceChatConversation_purgeAt_idx" ON "WorkspaceChatConversation"("purgeAt");

-- CreateIndex
CREATE INDEX "WorkspaceChatMessage_conversationId_createdAt_idx" ON "WorkspaceChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceChatActionPlan_assistantMessageId_key" ON "WorkspaceChatActionPlan"("assistantMessageId");

-- CreateIndex
CREATE INDEX "WorkspaceChatActionPlan_conversationId_createdAt_idx" ON "WorkspaceChatActionPlan"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceChatActionPlan_expiresAt_idx" ON "WorkspaceChatActionPlan"("expiresAt");

-- CreateIndex
CREATE INDEX "WorkspaceChatAction_planId_status_idx" ON "WorkspaceChatAction"("planId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceChatAction_planId_order_key" ON "WorkspaceChatAction"("planId", "order");

-- AddForeignKey
ALTER TABLE "WorkspaceChatConversation" ADD CONSTRAINT "WorkspaceChatConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceChatConversation" ADD CONSTRAINT "WorkspaceChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceChatConversation" ADD CONSTRAINT "WorkspaceChatConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceChatMessage" ADD CONSTRAINT "WorkspaceChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WorkspaceChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceChatActionPlan" ADD CONSTRAINT "WorkspaceChatActionPlan_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WorkspaceChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceChatActionPlan" ADD CONSTRAINT "WorkspaceChatActionPlan_assistantMessageId_fkey" FOREIGN KEY ("assistantMessageId") REFERENCES "WorkspaceChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceChatAction" ADD CONSTRAINT "WorkspaceChatAction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkspaceChatActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
