import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KanbanService } from './kanban.service';

const now = new Date('2026-07-16T00:00:00.000Z');

describe('KanbanService', () => {
  it('lets workspace members read a project board and creates it on first access', async () => {
    const prisma = createPrismaMock();
    const service = new KanbanService(prisma);

    const board = await service.getBoard('user-1', 'workspace-1', 'project-1');

    expect(board).toMatchObject({
      title: 'Kanban',
      projectId: 'project-1',
      columns: [],
    });
    expect(prisma.state.boards).toHaveLength(1);
  });

  it('rejects non-members and projects outside the workspace', async () => {
    const prisma = createPrismaMock();
    const service = new KanbanService(prisma);

    await expect(
      service.getBoard('outsider', 'workspace-1', 'project-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getBoard('user-1', 'workspace-1', 'project-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates columns at the next order and can reorder columns', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
        { id: 'column-2', title: 'Doing', order: 1, boardId: 'board-1' },
      ],
    });
    const service = new KanbanService(prisma);

    const column = await service.createColumn(
      'user-1',
      'workspace-1',
      'project-1',
      {
        title: 'Done',
      },
    );
    await service.updateColumn(
      'user-1',
      'workspace-1',
      'project-1',
      column.id,
      {
        order: 0,
        title: 'Shipped',
      },
    );

    expect(column.order).toBe(2);
    expect(orderedColumns(prisma)).toEqual([
      'column-3',
      'column-1',
      'column-2',
    ]);
    expect(
      prisma.state.columns.find((item) => item.id === column.id)?.title,
    ).toBe('Shipped');
  });

  it('creates tasks at the next order and requires assignees to be workspace members', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Existing',
          description: null,
          order: 0,
          columnId: 'column-1',
          assigneeId: null,
          createdAt: now,
        },
      ],
    });
    const service = new KanbanService(prisma);

    await expect(
      service.createTask('user-1', 'workspace-1', 'project-1', {
        title: 'Blocked',
        columnId: 'column-1',
        assigneeId: 'outsider',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const task = await service.createTask(
      'user-1',
      'workspace-1',
      'project-1',
      {
        title: 'Next',
        columnId: 'column-1',
        assigneeId: 'user-2',
      },
    );

    expect(task.order).toBe(1);
    expect(task.assigneeId).toBe('user-2');
  });

  it('notifies a new assignee once and skips unchanged assignees', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
      ],
      tasks: [
        {
          ...task('task-1', 'Assigned task', 'column-1', 0),
          assigneeId: null,
        },
      ],
    });
    const notifications = { notifyTaskAssigned: jest.fn() };
    const service = new KanbanService(
      prisma,
      undefined,
      notifications as never,
    );

    await service.updateTask('user-1', 'workspace-1', 'project-1', 'task-1', {
      assigneeId: 'user-2',
    });
    await service.updateTask('user-1', 'workspace-1', 'project-1', 'task-1', {
      assigneeId: 'user-2',
      title: 'Renamed',
    });

    expect(notifications.notifyTaskAssigned).toHaveBeenCalledTimes(1);
    expect(notifications.notifyTaskAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'user-2', taskId: 'task-1' }),
    );
  });

  it('moves tasks while keeping source and target column orders continuous', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
        { id: 'column-2', title: 'Doing', order: 1, boardId: 'board-1' },
      ],
      tasks: [
        task('task-1', 'A', 'column-1', 0),
        task('task-2', 'B', 'column-1', 1),
        task('task-3', 'C', 'column-1', 2),
        task('task-4', 'D', 'column-2', 0),
      ],
    });
    const service = new KanbanService(prisma);

    await service.moveTask('user-1', 'workspace-1', 'project-1', 'task-2', {
      columnId: 'column-2',
      order: 1,
    });

    expect(orderedTasks(prisma, 'column-1')).toEqual(['task-1', 'task-3']);
    expect(orderedTasks(prisma, 'column-2')).toEqual(['task-4', 'task-2']);
    expect(taskOrders(prisma, 'column-1')).toEqual([0, 1]);
    expect(taskOrders(prisma, 'column-2')).toEqual([0, 1]);
  });

  it('deletes tasks and normalizes the remaining task order', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
      ],
      tasks: [
        task('task-1', 'A', 'column-1', 0),
        task('task-2', 'B', 'column-1', 1),
        task('task-3', 'C', 'column-1', 2),
      ],
    });
    const service = new KanbanService(prisma);

    await service.deleteTask('user-1', 'workspace-1', 'project-1', 'task-2');

    expect(orderedTasks(prisma, 'column-1')).toEqual(['task-1', 'task-3']);
    expect(taskOrders(prisma, 'column-1')).toEqual([0, 1]);
  });

  it('requires a target column before deleting a column that has tasks', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
        { id: 'column-2', title: 'Doing', order: 1, boardId: 'board-1' },
      ],
      tasks: [task('task-1', 'A', 'column-1', 0)],
    });
    const service = new KanbanService(prisma);

    await expect(
      service.deleteColumn(
        'user-1',
        'workspace-1',
        'project-1',
        'column-1',
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves tasks before deleting a column and keeps orders continuous', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
        { id: 'column-2', title: 'Doing', order: 1, boardId: 'board-1' },
        { id: 'column-3', title: 'Done', order: 2, boardId: 'board-1' },
      ],
      tasks: [
        task('task-1', 'A', 'column-1', 0),
        task('task-2', 'B', 'column-2', 0),
      ],
    });
    const service = new KanbanService(prisma);

    await service.deleteColumn(
      'user-1',
      'workspace-1',
      'project-1',
      'column-1',
      {
        moveTasksToColumnId: 'column-2',
      },
    );

    expect(orderedColumns(prisma)).toEqual(['column-2', 'column-3']);
    expect(orderedTasks(prisma, 'column-2')).toEqual(['task-2', 'task-1']);
    expect(taskOrders(prisma, 'column-2')).toEqual([0, 1]);
  });

  it('does not delete the final column', async () => {
    const prisma = createPrismaMock({
      boards: [{ id: 'board-1', title: 'Kanban', projectId: 'project-1' }],
      columns: [
        { id: 'column-1', title: 'Todo', order: 0, boardId: 'board-1' },
      ],
    });
    const service = new KanbanService(prisma);

    await expect(
      service.deleteColumn(
        'user-1',
        'workspace-1',
        'project-1',
        'column-1',
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

type WorkspaceMemberRecord = {
  id: string;
  userId: string;
  workspaceId: string;
};
type ProjectRecord = { id: string; workspaceId: string };
type BoardRecord = { id: string; title: string; projectId: string };
type ColumnRecord = {
  id: string;
  title: string;
  order: number;
  boardId: string;
};
type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  createdAt: Date;
};
type UserRecord = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type MockState = {
  workspaceMembers: WorkspaceMemberRecord[];
  projects: ProjectRecord[];
  boards: BoardRecord[];
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  users: UserRecord[];
};

function createPrismaMock(initial: Partial<MockState> = {}) {
  const state: MockState = {
    workspaceMembers: [
      { id: 'member-1', userId: 'user-1', workspaceId: 'workspace-1' },
      { id: 'member-2', userId: 'user-2', workspaceId: 'workspace-1' },
    ],
    projects: [
      { id: 'project-1', workspaceId: 'workspace-1' },
      { id: 'project-2', workspaceId: 'workspace-2' },
    ],
    boards: [],
    columns: [],
    tasks: [],
    users: [
      {
        id: 'user-2',
        name: 'Assignee',
        email: 'assignee@example.com',
        avatarUrl: null,
      },
    ],
    ...initial,
  };

  const prisma = {
    state,
    $transaction: jest.fn((operation: (client: any) => unknown) =>
      operation(prisma),
    ),
    workspaceMember: {
      findUnique: jest.fn(({ where }: any) => {
        const membership = state.workspaceMembers.find(
          (item) =>
            item.userId === where.userId_workspaceId.userId &&
            item.workspaceId === where.userId_workspaceId.workspaceId,
        );
        return Promise.resolve(membership ?? null);
      }),
    },
    project: {
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          state.projects.find(
            (project) =>
              project.id === where.id &&
              project.workspaceId === where.workspaceId,
          ) ?? null,
        ),
      ),
    },
    board: {
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          state.boards.find((board) => board.projectId === where.projectId) ??
            null,
        ),
      ),
      create: jest.fn(({ data }: any) => {
        const board = { id: `board-${state.boards.length + 1}`, ...data };
        state.boards.push(board);
        return Promise.resolve(board);
      }),
      findUniqueOrThrow: jest.fn(({ where }: any) => {
        const board = state.boards.find((item) => item.id === where.id);
        if (!board) throw new Error('Board not found');
        return Promise.resolve({
          ...board,
          columns: sortByOrder(
            state.columns.filter((column) => column.boardId === board.id),
          ).map((column) => ({
            ...column,
            tasks: tasksWithAssignee(state, column.id),
          })),
        });
      }),
    },
    column: {
      aggregate: jest.fn(({ where }: any) =>
        Promise.resolve({
          _max: {
            order: maxOrder(
              state.columns.filter(
                (column) => column.boardId === where.boardId,
              ),
            ),
          },
        }),
      ),
      create: jest.fn(({ data }: any) => {
        const column = { id: `column-${state.columns.length + 1}`, ...data };
        state.columns.push(column);
        return Promise.resolve({ ...column, tasks: [] });
      }),
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          state.columns.find(
            (column) =>
              column.id === where.id && column.boardId === where.boardId,
          ) ?? null,
        ),
      ),
      count: jest.fn(({ where }: any) =>
        Promise.resolve(
          state.columns.filter((column) => column.boardId === where.boardId)
            .length,
        ),
      ),
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(
          sortByOrder(
            state.columns.filter((column) => column.boardId === where.boardId),
          ),
        ),
      ),
      update: jest.fn(({ where, data, include }: any) => {
        const index = state.columns.findIndex(
          (column) => column.id === where.id,
        );
        state.columns[index] = { ...state.columns[index], ...data };
        return Promise.resolve({
          ...state.columns[index],
          ...(include?.tasks
            ? { tasks: tasksWithAssignee(state, state.columns[index].id) }
            : {}),
        });
      }),
      delete: jest.fn(({ where }: any) => {
        const index = state.columns.findIndex(
          (column) => column.id === where.id,
        );
        const [deleted] = state.columns.splice(index, 1);
        return Promise.resolve(deleted);
      }),
    },
    task: {
      aggregate: jest.fn(({ where }: any) =>
        Promise.resolve({
          _max: {
            order: maxOrder(
              state.tasks.filter((task) => task.columnId === where.columnId),
            ),
          },
        }),
      ),
      create: jest.fn(({ data }: any) => {
        const taskRecord = {
          id: `task-${state.tasks.length + 1}`,
          createdAt: now,
          ...data,
        };
        state.tasks.push(taskRecord);
        return Promise.resolve(withAssignee(state, taskRecord));
      }),
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(
          state.tasks.find(
            (item) =>
              item.id === where.id &&
              state.columns.some(
                (column) =>
                  column.id === item.columnId &&
                  column.boardId === where.column.boardId,
              ),
          ) ?? null,
        ),
      ),
      findMany: jest.fn(({ where }: any) => {
        const tasks = state.tasks.filter((item) => {
          if (
            where.columnId !== undefined &&
            item.columnId !== where.columnId
          ) {
            return false;
          }
          if (where.id?.not !== undefined && item.id === where.id.not) {
            return false;
          }
          if (where.column?.boardId !== undefined) {
            return state.columns.some(
              (column) =>
                column.id === item.columnId &&
                column.boardId === where.column.boardId,
            );
          }
          return true;
        });
        return Promise.resolve(sortByOrder(tasks));
      }),
      update: jest.fn(({ where, data }: any) => {
        const index = state.tasks.findIndex((item) => item.id === where.id);
        state.tasks[index] = { ...state.tasks[index], ...data };
        return Promise.resolve(withAssignee(state, state.tasks[index]));
      }),
      delete: jest.fn(({ where }: any) => {
        const index = state.tasks.findIndex((item) => item.id === where.id);
        const [deleted] = state.tasks.splice(index, 1);
        return Promise.resolve(deleted);
      }),
      findUniqueOrThrow: jest.fn(({ where }: any) => {
        const item = state.tasks.find((record) => record.id === where.id);
        if (!item) throw new Error('Task not found');
        return Promise.resolve(withAssignee(state, item));
      }),
    },
  } as any;

  return prisma;
}

function task(
  id: string,
  title: string,
  columnId: string,
  order: number,
): TaskRecord {
  return {
    id,
    title,
    description: null,
    order,
    columnId,
    assigneeId: null,
    createdAt: now,
  };
}

function orderedColumns(prisma: { state: MockState }): string[] {
  return sortByOrder(prisma.state.columns).map((column) => column.id);
}

function orderedTasks(
  prisma: { state: MockState },
  columnId: string,
): string[] {
  return sortByOrder(
    prisma.state.tasks.filter((item) => item.columnId === columnId),
  ).map((item) => item.id);
}

function taskOrders(prisma: { state: MockState }, columnId: string): number[] {
  return sortByOrder(
    prisma.state.tasks.filter((item) => item.columnId === columnId),
  ).map((item) => item.order);
}

function sortByOrder<T extends { id: string; order: number }>(
  records: T[],
): T[] {
  return [...records].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  );
}

function maxOrder(records: Array<{ order: number }>): number | null {
  if (records.length === 0) return null;
  return Math.max(...records.map((record) => record.order));
}

function tasksWithAssignee(state: MockState, columnId: string) {
  return sortByOrder(
    state.tasks.filter((item) => item.columnId === columnId),
  ).map((item) => withAssignee(state, item));
}

function withAssignee(state: MockState, item: TaskRecord) {
  return {
    ...item,
    assignee:
      state.users.find((user) => user.id === item.assigneeId) ??
      (item.assigneeId ? null : null),
  };
}
