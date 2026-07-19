import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  //Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { DashboardService } from './dashboard.service';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.dashboardService.getDashboard(user.id, workspaceId);
  }

  // @Post('reports/weekly')
  // generateWeeklyReport(
  //   @CurrentUser() user: AuthenticatedUser,
  //   @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  // ) {
  //   return this.dashboardService.generateWeeklyReport(user.id, workspaceId);
  // }
}
