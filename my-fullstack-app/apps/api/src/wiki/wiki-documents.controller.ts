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
import type { WikiDocument } from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  parseCreateWikiDocumentDto,
  parseUpdateWikiDocumentDto,
} from './dto/wiki-document.dto';
import { WikiDocumentsService } from './wiki-documents.service';

@Controller('workspaces/:workspaceId/projects/:projectId/wiki-documents')
@UseGuards(JwtAuthGuard)
export class WikiDocumentsController {
  constructor(private readonly wikiDocumentsService: WikiDocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ): Promise<WikiDocument[]> {
    return this.wikiDocumentsService.list(user.id, workspaceId, projectId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() body: unknown,
  ): Promise<WikiDocument> {
    return this.wikiDocumentsService.create(
      user.id,
      workspaceId,
      projectId,
      parseCreateWikiDocumentDto(body),
    );
  }

  @Patch(':documentId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() body: unknown,
  ): Promise<WikiDocument> {
    return this.wikiDocumentsService.update(
      user.id,
      workspaceId,
      projectId,
      documentId,
      parseUpdateWikiDocumentDto(body),
    );
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ): Promise<void> {
    return this.wikiDocumentsService.delete(
      user.id,
      workspaceId,
      projectId,
      documentId,
    );
  }
}
