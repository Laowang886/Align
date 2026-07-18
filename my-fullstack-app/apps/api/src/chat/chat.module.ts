import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatFileStorageService } from './chat-file-storage.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatFileStorageService],
})
export class ChatModule {}
