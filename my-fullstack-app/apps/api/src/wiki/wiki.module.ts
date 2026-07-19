import { Module } from '@nestjs/common';
import { WikiDocumentsController } from './wiki-documents.controller';
import { WikiDocumentsService } from './wiki-documents.service';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [WikiDocumentsController],
  providers: [WikiDocumentsService],
})
export class WikiModule {}
