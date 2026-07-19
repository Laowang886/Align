import {
  //BadGatewayException,
  Injectable,
  NotFoundException,
  //ServiceUnavailableException,
} from '@nestjs/common';
//import { createHash } from 'node:crypto';
import type {
  ColumnCategory,
  DashboardWorkloadItem,
  //WeeklyReport,
  WorkspaceDashboard,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORIES: ColumnCategory[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceDashboard> {
    await this.assertAccess(userId, workspaceId);

    const [projects, members, activeSprint, deadlines, activities] =
      await Promise.all([
        this.prisma.project.findMany({
          where: { workspaceId },
          select: {
            id: true,
            name: true,
            boards: {
              select: {
                columns: {
                  select: {
                    category: true,
                    tasks: {
                      select: {
                        id: true,
                        storyPoints: true,
                        assigneeId: true,
                        assignee: {
                          select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.workspaceMember.findMany({
          where: { workspaceId },
          select: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        }),
        this.prisma.sprint.findFirst({
          where: { status: 'ACTIVE', project: { workspaceId } },
          include: { project: { select: { id: true, name: true } } },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.task.findMany({
          where: {
            dueDate: { not: null },
            column: {
              category: { not: 'DONE' },
              board: { project: { workspaceId } },
            },
          },
          include: {
            column: {
              include: {
                board: {
                  include: { project: { select: { id: true, name: true } } },
                },
              },
            },
          },
          orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
          take: 5,
        }),
        this.prisma.activityLog.findMany({
          where: { workspaceId },
          include: { actor: { select: { name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      ]);

    const statusCounts = new Map(CATEGORIES.map((category) => [category, 0]));
    const workload = new Map<string, DashboardWorkloadItem>(
      members.map(({ user }) => [
        user.id,
        {
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          done: 0,
          remaining: 0,
        },
      ]),
    );
    const unassigned: DashboardWorkloadItem = {
      userId: null,
      name: 'Unassigned',
      avatarUrl: null,
      done: 0,
      remaining: 0,
    };

    let totalTasks = 0;
    let deliveredTasks = 0;
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;
    let unestimatedTasks = 0;

    for (const project of projects) {
      for (const board of project.boards) {
        for (const column of board.columns) {
          statusCounts.set(
            column.category,
            (statusCounts.get(column.category) ?? 0) + column.tasks.length,
          );
          for (const task of column.tasks) {
            totalTasks += 1;
            const done = column.category === 'DONE';
            if (done) deliveredTasks += 1;
            if (task.storyPoints === null) unestimatedTasks += 1;
            else {
              totalStoryPoints += task.storyPoints;
              if (done) completedStoryPoints += task.storyPoints;
            }
            const item = task.assigneeId
              ? (workload.get(task.assigneeId) ?? unassigned)
              : unassigned;
            if (done) item.done += 1;
            else item.remaining += 1;
          }
        }
      }
    }

    const workloadItems = [...workload.values()].filter(
      (item) => item.done + item.remaining > 0,
    );
    if (unassigned.done + unassigned.remaining > 0)
      workloadItems.push(unassigned);

    return {
      workspaceId,
      generatedAt: new Date().toISOString(),
      metrics: {
        activeProjects: projects.length,
        deliveredTasks,
        totalTasks,
        completionRate:
          totalTasks === 0
            ? 0
            : Math.round((deliveredTasks / totalTasks) * 100),
        completedStoryPoints,
        totalStoryPoints,
        unestimatedTasks,
      },
      activeSprint: activeSprint
        ? {
            id: activeSprint.id,
            name: activeSprint.name,
            goal: activeSprint.goal,
            projectId: activeSprint.project.id,
            projectName: activeSprint.project.name,
            endDate: activeSprint.endDate.toISOString().slice(0, 10),
          }
        : null,
      workload: workloadItems,
      statusBreakdown: CATEGORIES.map((category) => ({
        category,
        count: statusCounts.get(category) ?? 0,
      })),
      deadlines: deadlines.map((task) => ({
        id: task.id,
        code: task.code,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate!.toISOString().slice(0, 10),
        projectId: task.column.board.project.id,
        projectName: task.column.board.project.name,
      })),
      activities: activities.map((activity) => ({
        id: activity.id,
        actorName: activity.actor?.name ?? 'Former member',
        actorAvatarUrl: activity.actor?.avatarUrl ?? null,
        action: activity.action,
        summary: activity.summary,
        projectId: activity.projectId,
        createdAt: activity.createdAt.toISOString(),
      })),
    };
  }

  //AI Api fetch
  // async generateWeeklyReport(
  //   userId: string,
  //   workspaceId: string,
  // ): Promise<WeeklyReport> {
  //   const dashboard = await this.getDashboard(userId, workspaceId);
  //   const apiKey = process.env.OPENAI_API_KEY;
  //   if (!apiKey) {
  //     throw new ServiceUnavailableException(
  //       'AI weekly reports require OPENAI_API_KEY on the API service',
  //     );
  //   }
  //   const model = process.env.OPENAI_REPORT_MODEL ?? 'gpt-5.6-terra';
  //   const controller = new AbortController();
  //   const timeout = setTimeout(() => controller.abort(), 30_000);
  //   let response: Response;
  //   try {
  //     response = await fetch('https://api.openai.com/v1/responses', {
  //       method: 'POST',
  //       signal: controller.signal,
  //       headers: {
  //         Authorization: `Bearer ${apiKey}`,
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         model,
  //         reasoning: { effort: 'low' },
  //         safety_identifier: createHash('sha256').update(userId).digest('hex'),
  //         instructions:
  //           'Create a concise, factual weekly project report in Markdown. Use only the supplied JSON. Do not invent numbers, people, dates, or causes. Include Progress, Workload, Deadlines, Recent activity, and Next-week focus sections.',
  //         input: JSON.stringify(dashboard),
  //       }),
  //     });
  //   } catch {
  //     throw new BadGatewayException(
  //       'OpenAI could not generate the weekly report',
  //     );
  //   } finally {
  //     clearTimeout(timeout);
  //   }
  //   if (!response.ok) {
  //     throw new BadGatewayException(
  //       'OpenAI could not generate the weekly report',
  //     );
  //   }
  //   const payload = (await response.json()) as unknown;
  //   const markdown = extractResponseText(payload);
  //   if (!markdown)
  //     throw new BadGatewayException('OpenAI returned an empty report');
  //   return { markdown, generatedAt: new Date().toISOString(), model };
  // }

  private async assertAccess(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Workspace not found');
  }
}

// function extractResponseText(value: unknown): string | null {
//   if (typeof value !== 'object' || value === null) return null;
//   const output = (value as { output?: unknown }).output;
//   if (!Array.isArray(output)) return null;
//   for (const item of output) {
//     if (typeof item !== 'object' || item === null) continue;
//     const content = (item as { content?: unknown }).content;
//     if (!Array.isArray(content)) continue;
//     for (const part of content) {
//       if (typeof part !== 'object' || part === null) continue;
//       const text = (part as { text?: unknown }).text;
//       if (typeof text === 'string' && text.trim()) return text.trim();
//     }
//   }
//   return null;
// }
