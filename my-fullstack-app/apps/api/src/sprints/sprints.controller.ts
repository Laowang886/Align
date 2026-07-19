import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Sprint } from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  parseCreateSprintDto,
  parseUpdateSprintStatusDto,
} from './dto/sprint.dto';
import { SprintsService } from './sprints.service';

@Controller('workspaces/:workspaceId/projects/:projectId/sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ): Promise<Sprint[]> {
    return this.sprintsService.list(user.id, workspaceId, projectId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() body: unknown,
  ): Promise<Sprint> {
    return this.sprintsService.create(
      user.id,
      workspaceId,
      projectId,
      parseCreateSprintDto(body),
    );
  }

  @Patch(':sprintId/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
    @Body() body: unknown,
  ): Promise<Sprint> {
    return this.sprintsService.updateStatus(
      user.id,
      workspaceId,
      projectId,
      sprintId,
      parseUpdateSprintStatusDto(body),
    );
  }
}
