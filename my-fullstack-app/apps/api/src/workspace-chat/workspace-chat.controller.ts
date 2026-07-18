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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  parseCreateWorkspaceChatConversationDto,
  parseCreateWorkspaceChatMessageDto,
  parseUpdateWorkspaceChatConversationDto,
} from './dto/workspace-chat.dto';
import { WorkspaceChatService } from './workspace-chat.service';

@Controller('workspaces/:workspaceId/workspace-chat')
@UseGuards(JwtAuthGuard)
export class WorkspaceChatController {
  constructor(private readonly workspaceChatService: WorkspaceChatService) {}

  @Post('conversations')
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.workspaceChatService.createConversation(
      user.id,
      workspaceId,
      parseCreateWorkspaceChatConversationDto(body),
    );
  }

  @Get('conversations')
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaceChatService.listConversations(user.id, workspaceId);
  }

  @Get('conversations/:conversationId')
  getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
  ) {
    return this.workspaceChatService.getConversation(
      user.id,
      workspaceId,
      conversationId,
    );
  }

  @Patch('conversations/:conversationId')
  updateConversationTitle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() body: unknown,
  ) {
    return this.workspaceChatService.updateConversationTitle(
      user.id,
      workspaceId,
      conversationId,
      parseUpdateWorkspaceChatConversationDto(body),
    );
  }

  @Delete('conversations/:conversationId')
  @HttpCode(204)
  deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
  ) {
    return this.workspaceChatService.deleteConversation(
      user.id,
      workspaceId,
      conversationId,
    );
  }

  @Post('conversations/:conversationId/messages')
  createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() body: unknown,
  ) {
    return this.workspaceChatService.createUserMessage(
      user.id,
      workspaceId,
      conversationId,
      parseCreateWorkspaceChatMessageDto(body),
    );
  }
}
