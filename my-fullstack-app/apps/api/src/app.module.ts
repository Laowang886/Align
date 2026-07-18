import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { WikiModule } from './wiki/wiki.module';
import { KanbanModule } from './kanban/kanban.module';
import { SprintsModule } from './sprints/sprints.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HumanChatModule } from './human-chat/human-chat.module';
import { WorkspaceChatModule } from './workspace-chat/workspace-chat.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    WikiModule,
    KanbanModule,
    SprintsModule,
    DashboardModule,
    HumanChatModule,
    WorkspaceChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
