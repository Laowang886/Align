import { Module } from '@nestjs/common';
import { ProjectController, ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [ProjectsController, ProjectController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
