import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  parseCreateHumanChatChannelDto,
  parseCreateHumanChatMessageDto,
} from './dto/human-chat.dto';
import { HumanChatService } from './human-chat.service';

@Controller('workspaces/:workspaceId/chat')
@UseGuards(JwtAuthGuard)
export class HumanChatController {
  constructor(private readonly humanChatService: HumanChatService) {}

  @Get('channels')
  listChannels(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.humanChatService.listChannels(user.id, workspaceId);
  }

  @Post('channels')
  createChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.humanChatService.createChannel(
      user.id,
      workspaceId,
      parseCreateHumanChatChannelDto(body),
    );
  }

  @Get('channels/:channelId/messages')
  listChannelMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ) {
    return this.humanChatService.listChannelMessages(
      user.id,
      workspaceId,
      channelId,
    );
  }

  @Post('channels/:channelId/messages')
  createChannelMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() body: unknown,
  ) {
    return this.humanChatService.createChannelMessage(
      user.id,
      workspaceId,
      channelId,
      parseCreateHumanChatMessageDto(body),
    );
  }

  @Get('direct-messages')
  listDirectMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.humanChatService.listDirectMessages(user.id, workspaceId);
  }

  @Post('direct-messages/:memberId')
  getOrCreateDirectMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
  ) {
    return this.humanChatService.getOrCreateDirectMessage(
      user.id,
      workspaceId,
      memberId,
    );
  }

  @Get('direct-messages/:conversationId/messages')
  listDirectMessageMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
  ) {
    return this.humanChatService.listDirectMessageMessages(
      user.id,
      workspaceId,
      conversationId,
    );
  }

  @Post('direct-messages/:conversationId/messages')
  createDirectMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() body: unknown,
  ) {
    return this.humanChatService.createDirectMessage(
      user.id,
      workspaceId,
      conversationId,
      parseCreateHumanChatMessageDto(body),
    );
  }
}
