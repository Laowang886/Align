import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateSafetyReportDto } from './dto/create-safety-report.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createFeedback(userId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedbackSubmission.create({
      data: { userId, type: dto.type, content: dto.content },
    });
  }

  async createSafetyReport(userId: string, dto: CreateSafetyReportDto) {
    return this.prisma.safetyReport.create({
      data: { userId, category: dto.category, description: dto.description },
    });
  }
}
