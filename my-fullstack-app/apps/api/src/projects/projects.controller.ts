import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Project } from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { parseCreateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ): Promise<Project[]> {
    return this.projectsService.list(user.id, workspaceId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: unknown,
  ): Promise<Project> {
    return this.projectsService.create(
      user.id,
      workspaceId,
      parseCreateProjectDto(body),
    );
  }
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':projectId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ): Promise<Project> {
    return this.projectsService.get(user.id, projectId);
  }

  @Delete(':projectId')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ): Promise<void> {
    return this.projectsService.delete(user.id, projectId);
  }
}
