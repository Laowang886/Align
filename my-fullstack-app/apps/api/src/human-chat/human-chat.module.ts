import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HumanChatController } from './human-chat.controller';
import { HumanChatService } from './human-chat.service';

@Module({
  imports: [PrismaModule],
  controllers: [HumanChatController],
  providers: [HumanChatService],
})
export class HumanChatModule {}
