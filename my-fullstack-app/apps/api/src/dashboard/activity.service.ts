import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordActivityInput {
  workspaceId: string;
  actorId?: string | null;
  projectId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordActivityInput): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId ?? null,
        projectId: input.projectId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        summary: input.summary,
      },
    });
  }
}
