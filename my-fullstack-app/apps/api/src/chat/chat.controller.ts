import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type {
  ChatChannel,
  ChatConversation,
  ChatMessage,
  WorkspaceChatState,
} from '@repo/shared';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ChatService } from './chat.service';
import type { ChatUploadedFile } from './chat-file-storage.service';
import {
  parseCreateChatChannelDto,
  parseCreateChatMessageDto,
  parseUpdateChatChannelDto,
  parseUpdateChatChannelNoticeDto,
} from './dto/chat.dto';

const CHAT_UPLOAD_LIMITS = {
  files: 10,
  fileSize: 10 * 1024 * 1024,
};

@Controller('workspaces/:workspaceId/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  getState(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ): Promise<WorkspaceChatState> {
    return this.chatService.getWorkspaceChatState(user.id, workspaceId);
  }

  @Post('channels')
  createChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: unknown,
  ): Promise<ChatChannel> {
    return this.chatService.createChannel(
      user.id,
      workspaceId,
      parseCreateChatChannelDto(body),
    );
  }

  @Get('channels/:channelId')
  getChannelConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ): Promise<ChatConversation> {
    return this.chatService.getChannelConversation(
      user.id,
      workspaceId,
      channelId,
    );
  }

  @Patch('channels/:channelId')
  updateChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() body: unknown,
  ): Promise<ChatChannel> {
    return this.chatService.updateChannel(
      user.id,
      workspaceId,
      channelId,
      parseUpdateChatChannelDto(body),
    );
  }

  @Patch('channels/:channelId/notice')
  updateChannelNotice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() body: unknown,
  ): Promise<ChatChannel> {
    return this.chatService.updateChannelNotice(
      user.id,
      workspaceId,
      channelId,
      parseUpdateChatChannelNoticeDto(body),
    );
  }

  @Get('channels/:channelId/messages')
  getChannelMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ): Promise<ChatMessage[]> {
    return this.chatService.getChannelMessages(user.id, workspaceId, channelId);
  }

  @Post('channels/:channelId/messages')
  @UseInterceptors(FilesInterceptor('attachments', 10, { limits: CHAT_UPLOAD_LIMITS }))
  createChannelMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() body: unknown,
    @UploadedFiles() files: ChatUploadedFile[] = [],
  ): Promise<ChatMessage> {
    const hasFiles = files.length > 0;
    return this.chatService.createChannelMessage(
      user.id,
      workspaceId,
      channelId,
      parseCreateChatMessageDto(body, { allowEmptyContent: hasFiles }),
      files,
    );
  }

  @Delete('channels/:channelId/messages')
  @HttpCode(204)
  clearChannelMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ): Promise<void> {
    return this.chatService.clearChannelMessages(
      user.id,
      workspaceId,
      channelId,
    );
  }

  @Delete('channels/:channelId')
  @HttpCode(204)
  deleteChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ): Promise<void> {
    return this.chatService.deleteChannel(user.id, workspaceId, channelId);
  }

  @Get('direct/:userId')
  getDirectConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
  ): Promise<ChatConversation> {
    return this.chatService.getDirectConversation(
      user.id,
      workspaceId,
      targetUserId,
    );
  }

  @Get('direct/:userId/messages')
  getDirectMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
  ): Promise<ChatMessage[]> {
    return this.chatService.getDirectMessages(
      user.id,
      workspaceId,
      targetUserId,
    );
  }

  @Post('direct/:userId/messages')
  @UseInterceptors(FilesInterceptor('attachments', 10, { limits: CHAT_UPLOAD_LIMITS }))
  createDirectMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
    @Body() body: unknown,
    @UploadedFiles() files: ChatUploadedFile[] = [],
  ): Promise<ChatMessage> {
    const hasFiles = files.length > 0;
    return this.chatService.createDirectMessage(
      user.id,
      workspaceId,
      targetUserId,
      parseCreateChatMessageDto(body, { allowEmptyContent: hasFiles }),
      files,
    );
  }

  @Get('attachments/:attachmentId')
  async getAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const attachment = await this.chatService.getAttachmentForDownload(
      user.id,
      workspaceId,
      attachmentId,
    );
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader('Content-Length', String(attachment.sizeBytes));
    response.setHeader(
      'Content-Disposition',
      `${download === '1' ? 'attachment' : 'inline'}; filename="${safeHeaderFilename(
        attachment.originalName,
      )}"`,
    );
    return new StreamableFile(attachment.buffer);
  }
}

function safeHeaderFilename(filename: string): string {
  return filename.replace(/[^\x20-\x7e]|["\\]/g, '_');
}
