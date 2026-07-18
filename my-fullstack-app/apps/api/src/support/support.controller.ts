import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportService } from './support.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateSafetyReportDto } from './dto/create-safety-report.dto';

@Controller()
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  async submitFeedback(@Req() req, @Body() dto: CreateFeedbackDto) {
    return this.supportService.createFeedback(req.user.id, dto);
  }

  @Post('safety-reports')
  @UseGuards(JwtAuthGuard)
  async submitSafetyReport(@Req() req, @Body() dto: CreateSafetyReportDto) {
    return this.supportService.createSafetyReport(req.user.id, dto);
  }
}
