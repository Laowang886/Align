import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, DashboardModule, NotificationsModule],
  controllers: [KanbanController],
  providers: [KanbanService],
})
export class KanbanModule {}
