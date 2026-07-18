import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceChatController } from './workspace-chat.controller';
import { WorkspaceChatRetrievalService } from './workspace-chat-retrieval.service';
import { WorkspaceChatService } from './workspace-chat.service';

@Module({
  imports: [PrismaModule],
  providers: [WorkspaceChatService, WorkspaceChatRetrievalService],
  controllers: [WorkspaceChatController],
})
export class WorkspaceChatModule {}
