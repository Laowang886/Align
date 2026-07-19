import { NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const now = new Date('2026-07-16T12:00:00.000Z');

  function createPrisma(member: unknown = { id: 'membership-1' }) {
    return {
      workspaceMember: {
        findUnique: jest.fn().mockResolvedValue(member),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { user: { id: 'user-1', name: 'Renbo', avatarUrl: null } },
          ]),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'project-1',
            name: 'Align',
            boards: [
              {
                columns: [
                  {
                    category: 'IN_PROGRESS',
                    tasks: [
                      {
                        id: 'task-1',
                        storyPoints: 5,
                        assigneeId: 'user-1',
                        assignee: {
                          id: 'user-1',
                          name: 'Renbo',
                          avatarUrl: null,
                        },
                      },
                    ],
                  },
                  {
                    category: 'DONE',
                    tasks: [
                      {
                        id: 'task-2',
                        storyPoints: 3,
                        assigneeId: 'user-1',
                        assignee: {
                          id: 'user-1',
                          name: 'Renbo',
                          avatarUrl: null,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]),
      },
      sprint: { findFirst: jest.fn().mockResolvedValue(null) },
      task: { findMany: jest.fn().mockResolvedValue([]) },
      activityLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'activity-1',
            actor: { name: 'Renbo', avatarUrl: null },
            action: 'moved task',
            summary: 'AL-2 Dashboard',
            projectId: 'project-1',
            createdAt: now,
          },
        ]),
      },
    };
  }

  it('aggregates workspace task metrics, workload, statuses, and activity', async () => {
    const service = new DashboardService(createPrisma() as never);
    const dashboard = await service.getDashboard('user-1', 'workspace-1');

    expect(dashboard.metrics).toEqual({
      activeProjects: 1,
      deliveredTasks: 1,
      totalTasks: 2,
      completionRate: 50,
      completedStoryPoints: 3,
      totalStoryPoints: 8,
      unestimatedTasks: 0,
    });
    expect(dashboard.workload[0]).toMatchObject({
      name: 'Renbo',
      done: 1,
      remaining: 1,
    });
    expect(
      dashboard.statusBreakdown.find((item) => item.category === 'DONE')?.count,
    ).toBe(1);
    expect(dashboard.activities[0]?.action).toBe('moved task');
  });

  it('hides workspaces from non-members', async () => {
    const service = new DashboardService(createPrisma(null) as never);
    await expect(
      service.getDashboard('outsider', 'workspace-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // AI weekly-report generation is disabled.
  // it('requires an API key before generating an AI report', async () => {
  //   const previous = process.env.OPENAI_API_KEY;
  //   delete process.env.OPENAI_API_KEY;
  //   const service = new DashboardService(createPrisma() as never);
  //   await expect(
  //     service.generateWeeklyReport('user-1', 'workspace-1'),
  //   ).rejects.toBeInstanceOf(ServiceUnavailableException);
  //   if (previous) process.env.OPENAI_API_KEY = previous;
  // });
});
