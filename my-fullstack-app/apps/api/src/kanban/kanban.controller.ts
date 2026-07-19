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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  parseCreateKanbanColumnDto,
  parseCreateKanbanTaskDto,
  parseDeleteKanbanColumnDto,
  parseMoveKanbanTaskDto,
  parseUpdateKanbanColumnDto,
  parseUpdateKanbanTaskDto,
} from './dto/kanban.dto';
import { KanbanService } from './kanban.service';

@Controller('workspaces/:workspaceId/projects/:projectId/kanban')
@UseGuards(JwtAuthGuard)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get()
  getBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return this.kanbanService.getBoard(user.id, workspaceId, projectId);
  }

  @Post('columns')
  createColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() body: unknown,
  ) {
    return this.kanbanService.createColumn(
      user.id,
      workspaceId,
      projectId,
      parseCreateKanbanColumnDto(body),
    );
  }

  @Patch('columns/:columnId')
  updateColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
    @Body() body: unknown,
  ) {
    return this.kanbanService.updateColumn(
      user.id,
      workspaceId,
      projectId,
      columnId,
      parseUpdateKanbanColumnDto(body),
    );
  }

  @Delete('columns/:columnId')
  deleteColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
    @Body() body: unknown,
  ) {
    return this.kanbanService.deleteColumn(
      user.id,
      workspaceId,
      projectId,
      columnId,
      parseDeleteKanbanColumnDto(body),
    );
  }

  @Post('tasks')
  createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() body: unknown,
  ) {
    return this.kanbanService.createTask(
      user.id,
      workspaceId,
      projectId,
      parseCreateKanbanTaskDto(body),
    );
  }

  @Patch('tasks/:taskId')
  updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() body: unknown,
  ) {
    return this.kanbanService.updateTask(
      user.id,
      workspaceId,
      projectId,
      taskId,
      parseUpdateKanbanTaskDto(body),
    );
  }

  @Delete('tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    return this.kanbanService.deleteTask(
      user.id,
      workspaceId,
      projectId,
      taskId,
    );
  }

  @Patch('tasks/:taskId/move')
  moveTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() body: unknown,
  ) {
    return this.kanbanService.moveTask(
      user.id,
      workspaceId,
      projectId,
      taskId,
      parseMoveKanbanTaskDto(body),
    );
  }
}
