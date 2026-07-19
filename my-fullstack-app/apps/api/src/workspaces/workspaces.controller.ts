import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  WorkspaceDetails,
  WorkspaceMember,
  WorkspaceSummary,
} from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  parseInviteWorkspaceMemberDto,
  parseTransferOwnershipDto,
  parseUpdateMemberRoleDto,
} from './dto/workspace-member.dto';
import {
  parseCreateWorkspaceDto,
  parseUpdateWorkspaceDto,
} from './dto/workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<WorkspaceSummary> {
    return this.workspacesService.create(
      user.id,
      parseCreateWorkspaceDto(body),
    );
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<WorkspaceSummary[]> {
    return this.workspacesService.listForUser(user.id);
  }

  @Get(':workspaceId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ): Promise<WorkspaceDetails> {
    return this.workspacesService.getForUser(user.id, workspaceId);
  }

  @Get(':workspaceId/members')
  members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    return this.workspacesService.listMembers(user.id, workspaceId);
  }

  @Post(':workspaceId/members/invite')
  inviteMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: unknown,
  ): Promise<WorkspaceMember> {
    return this.workspacesService.inviteMember(user.id, workspaceId, parseInviteWorkspaceMemberDto(body));
  }

  @Patch(':workspaceId/members/:memberId')
  updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @Body() body: unknown,
  ): Promise<WorkspaceMember> {
    const input = parseUpdateMemberRoleDto(body);
    return this.workspacesService.updateMemberRole(
      user.id,
      workspaceId,
      memberId,
      input.role,
    );
  }

  @Delete(':workspaceId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
  ): Promise<void> {
    return this.workspacesService.removeMember(user.id, workspaceId, memberId);
  }

  @Post(':workspaceId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ): Promise<void> {
    return this.workspacesService.leave(user.id, workspaceId);
  }

  @Post(':workspaceId/transfer-ownership')
  @HttpCode(HttpStatus.NO_CONTENT)
  transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: unknown,
  ): Promise<void> {
    const input = parseTransferOwnershipDto(body);
    return this.workspacesService.transferOwnership(
      user.id,
      workspaceId,
      input.memberId,
    );
  }

  @Patch(':workspaceId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: unknown,
  ): Promise<WorkspaceDetails> {
    return this.workspacesService.update(
      user.id,
      workspaceId,
      parseUpdateWorkspaceDto(body),
    );
  }

  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ): Promise<void> {
    return this.workspacesService.delete(user.id, workspaceId);
  }
}
