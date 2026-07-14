import { Module } from '@nestjs/common';
import { WikiDocumentsController } from './wiki-documents.controller';
import { WikiDocumentsService } from './wiki-documents.service';

@Module({
  controllers: [WikiDocumentsController],
  providers: [WikiDocumentsService],
})
export class WikiModule {}
