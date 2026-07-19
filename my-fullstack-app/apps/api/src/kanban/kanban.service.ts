import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { ColumnCategory, TaskPriority } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../dashboard/activity.service';
import type {
  CreateKanbanColumnInput,
  CreateKanbanTaskInput,
  DeleteKanbanColumnInput,
  MoveKanbanTaskInput,
  UpdateKanbanColumnInput,
  UpdateKanbanTaskInput,
} from './dto/kanban.dto';

export interface KanbanBoard {
  id: string;
  title: string;
  projectId: string;
  columns: KanbanColumn[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  boardId: string;
  color: string;
  category: ColumnCategory;
  tasks: KanbanTask[];
}

export interface KanbanTask {
  id: string;
  code: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  storyPoints: number | null;
  sprintId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

type KanbanDatabase = Pick<
  PrismaService,
  'workspaceMember' | 'project' | 'board' | 'column' | 'task'
>;

@Injectable()
export class KanbanService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activity?: ActivityService,
  ) {}

  async getBoard(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<KanbanBoard> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.getOrCreateBoard(projectId);
    return this.readBoard(board.id);
  }

  async createColumn(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: CreateKanbanColumnInput,
  ): Promise<KanbanColumn> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.getOrCreateBoard(projectId);
    const maxOrder = await this.prisma.column.aggregate({
      where: { boardId: board.id },
      _max: { order: true },
    });
    const column = await this.prisma.column.create({
      data: {
        title: input.title,
        color: input.color ?? 'gray',
        category: input.category ?? 'TODO',
        order: (maxOrder._max.order ?? -1) + 1,
        boardId: board.id,
      },
      include: { tasks: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
    });
    await this.record(
      userId,
      workspaceId,
      projectId,
      'created status',
      'COLUMN',
      column.id,
      input.title,
    );
    return toColumn(column);
  }

  async updateColumn(
    userId: string,
    workspaceId: string,
    projectId: string,
    columnId: string,
    input: UpdateKanbanColumnInput,
  ): Promise<KanbanColumn> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.findBoard(projectId);
    if (!board) throw new NotFoundException('Kanban board not found');

    return this.prisma.$transaction(async (tx) => {
      const column = await this.findColumn(tx, board.id, columnId);
      if (!column) throw new NotFoundException('Kanban column not found');

      if (input.order !== undefined) {
        await this.moveColumn(tx, board.id, columnId, input.order);
      }
      const updated = await tx.column.update({
        where: { id: columnId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
        },
        include: { tasks: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
      });
      await this.record(
        userId,
        workspaceId,
        projectId,
        'updated status',
        'COLUMN',
        updated.id,
        updated.title,
      );
      return toColumn(updated);
    });
  }

  async deleteColumn(
    userId: string,
    workspaceId: string,
    projectId: string,
    columnId: string,
    input: DeleteKanbanColumnInput,
  ): Promise<void> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.findBoard(projectId);
    if (!board) throw new NotFoundException('Kanban board not found');

    await this.prisma.$transaction(async (tx) => {
      const column = await this.findColumn(tx, board.id, columnId);
      if (!column) throw new NotFoundException('Kanban column not found');

      const columnCount = await tx.column.count({
        where: { boardId: board.id },
      });
      if (columnCount <= 1) {
        throw new BadRequestException('Cannot delete the last Kanban column');
      }

      const tasks = await tx.task.findMany({
        where: { columnId },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      });
      if (tasks.length > 0 && !input.moveTasksToColumnId) {
        throw new BadRequestException(
          'moveTasksToColumnId is required when deleting a column with tasks',
        );
      }

      if (tasks.length > 0) {
        const targetColumn = await this.findColumn(
          tx,
          board.id,
          input.moveTasksToColumnId ?? '',
        );
        if (!targetColumn || targetColumn.id === columnId) {
          throw new BadRequestException(
            'moveTasksToColumnId must be another column',
          );
        }
        const targetTasks = await tx.task.findMany({
          where: { columnId: targetColumn.id },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        });
        const movedTasks = [...targetTasks, ...tasks];
        await Promise.all(
          movedTasks.map((task, order) =>
            tx.task.update({
              where: { id: task.id },
              data: { columnId: targetColumn.id, order },
            }),
          ),
        );
      }

      await tx.column.delete({ where: { id: columnId } });
      await this.normalizeColumnOrders(tx, board.id);
    });
    await this.record(
      userId,
      workspaceId,
      projectId,
      'deleted status',
      'COLUMN',
      columnId,
      'Kanban status',
    );
  }

  async createTask(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: CreateKanbanTaskInput,
  ): Promise<KanbanTask> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.getOrCreateBoard(projectId);
    const column = await this.findColumn(this.prisma, board.id, input.columnId);
    if (!column) throw new NotFoundException('Kanban column not found');
    await this.assertAssigneeIsWorkspaceMember(workspaceId, input.assigneeId);
    await this.assertSprintBelongsToProject(projectId, input.sprintId);

    const [maxOrder, project] = await Promise.all([
      this.prisma.task.aggregate({
        where: { columnId: input.columnId },
        _max: { order: true },
      }),
      this.prisma.project.findFirst({
        where: { id: projectId },
        select: { key: true },
      }),
    ]);
    const taskCount =
      typeof this.prisma.task.count === 'function'
        ? await this.prisma.task.count({
            where: { column: { boardId: board.id } },
          })
        : (maxOrder._max.order ?? -1) + 1;
    const task = await this.prisma.task.create({
      data: {
        code: `${project?.key ?? 'TASK'}-${taskCount + 1}`,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 'MEDIUM',
        dueDate: toDatabaseDate(input.dueDate),
        storyPoints: input.storyPoints ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
        columnId: input.columnId,
        assigneeId: input.assigneeId ?? null,
        sprintId: input.sprintId ?? null,
      },
      include: taskAssigneeInclude,
    });
    await this.record(
      userId,
      workspaceId,
      projectId,
      'created task',
      'TASK',
      task.id,
      `${task.code} ${task.title}`,
    );
    return toTask(task);
  }

  async updateTask(
    userId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
    input: UpdateKanbanTaskInput,
  ): Promise<KanbanTask> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.findBoard(projectId);
    if (!board) throw new NotFoundException('Kanban board not found');
    const task = await this.findTask(this.prisma, board.id, taskId);
    if (!task) throw new NotFoundException('Kanban task not found');
    await this.assertAssigneeIsWorkspaceMember(workspaceId, input.assigneeId);
    await this.assertSprintBelongsToProject(projectId, input.sprintId);

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.assigneeId !== undefined
          ? { assigneeId: input.assigneeId }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: toDatabaseDate(input.dueDate) }
          : {}),
        ...(input.storyPoints !== undefined
          ? { storyPoints: input.storyPoints }
          : {}),
        ...(input.sprintId !== undefined ? { sprintId: input.sprintId } : {}),
      },
      include: taskAssigneeInclude,
    });
    await this.record(
      userId,
      workspaceId,
      projectId,
      'updated task',
      'TASK',
      updated.id,
      `${updated.code} ${updated.title}`,
    );
    return toTask(updated);
  }

  async deleteTask(
    userId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.findBoard(projectId);
    if (!board) throw new NotFoundException('Kanban board not found');

    await this.prisma.$transaction(async (tx) => {
      const task = await this.findTask(tx, board.id, taskId);
      if (!task) throw new NotFoundException('Kanban task not found');
      await tx.task.delete({ where: { id: taskId } });
      await this.normalizeTaskOrders(tx, task.columnId);
    });
    await this.record(
      userId,
      workspaceId,
      projectId,
      'deleted task',
      'TASK',
      taskId,
      'Kanban task',
    );
  }

  async moveTask(
    userId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
    input: MoveKanbanTaskInput,
  ): Promise<KanbanTask> {
    await this.assertProjectAccess(userId, workspaceId, projectId);
    const board = await this.findBoard(projectId);
    if (!board) throw new NotFoundException('Kanban board not found');

    return this.prisma.$transaction(async (tx) => {
      const task = await this.findTask(tx, board.id, taskId);
      if (!task) throw new NotFoundException('Kanban task not found');
      const targetColumn = await this.findColumn(tx, board.id, input.columnId);
      if (!targetColumn) throw new NotFoundException('Kanban column not found');

      await this.placeTask(
        tx,
        board.id,
        taskId,
        task.columnId,
        input.columnId,
        input.order,
      );
      const moved = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        include: taskAssigneeInclude,
      });
      const result = toTask(moved);
      await this.record(
        userId,
        workspaceId,
        projectId,
        'moved task',
        'TASK',
        moved.id,
        `${moved.code} ${moved.title}`,
      );
      return result;
    });
  }

  private async assertProjectAccess(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Workspace not found');

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async assertAssigneeIsWorkspaceMember(
    workspaceId: string,
    assigneeId: string | null | undefined,
  ): Promise<void> {
    if (!assigneeId) return;
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: assigneeId, workspaceId } },
      select: { id: true },
    });
    if (!membership) {
      throw new BadRequestException('Assignee must be a workspace member');
    }
  }

  private async assertSprintBelongsToProject(
    projectId: string,
    sprintId: string | null | undefined,
  ): Promise<void> {
    if (!sprintId) return;
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
      select: { id: true },
    });
    if (!sprint)
      throw new BadRequestException('Sprint must belong to the project');
  }

  private async record(
    actorId: string,
    workspaceId: string,
    projectId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    summary: string,
  ): Promise<void> {
    await this.activity?.record({
      workspaceId,
      actorId,
      projectId,
      action,
      resourceType,
      resourceId,
      summary,
    });
  }

  private async getOrCreateBoard(projectId: string): Promise<{ id: string }> {
    const existing = await this.findBoard(projectId);
    if (existing) return existing;
    return this.prisma.board.create({
      data: {
        title: 'Kanban',
        projectId,
        columns: {
          create: [
            { title: 'Backlog', order: 0, color: 'gray', category: 'BACKLOG' },
            { title: 'To do', order: 1, color: 'blue', category: 'TODO' },
            {
              title: 'In progress',
              order: 2,
              color: 'amber',
              category: 'IN_PROGRESS',
            },
            {
              title: 'In review',
              order: 3,
              color: 'purple',
              category: 'REVIEW',
            },
            { title: 'Done', order: 4, color: 'green', category: 'DONE' },
          ],
        },
      },
      select: { id: true },
    });
  }

  private async findBoard(projectId: string): Promise<{ id: string } | null> {
    return this.prisma.board.findFirst({
      where: { projectId },
      select: { id: true },
    });
  }

  private async readBoard(boardId: string): Promise<KanbanBoard> {
    const board = await this.prisma.board.findUniqueOrThrow({
      where: { id: boardId },
      include: boardInclude,
    });
    return toBoard(board);
  }

  private async findColumn(
    db: KanbanDatabase,
    boardId: string,
    columnId: string,
  ): Promise<{ id: string; order: number } | null> {
    return db.column.findFirst({
      where: { id: columnId, boardId },
      select: { id: true, order: true },
    });
  }

  private async findTask(
    db: KanbanDatabase,
    boardId: string,
    taskId: string,
  ): Promise<{ id: string; columnId: string; order: number } | null> {
    return db.task.findFirst({
      where: { id: taskId, column: { boardId } },
      select: { id: true, columnId: true, order: true },
    });
  }

  private async moveColumn(
    db: KanbanDatabase,
    boardId: string,
    columnId: string,
    targetOrder: number,
  ): Promise<void> {
    const columns = await db.column.findMany({
      where: { boardId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const current = columns.find((column) => column.id === columnId);
    if (!current) throw new NotFoundException('Kanban column not found');
    const withoutCurrent = columns.filter((column) => column.id !== columnId);
    const clampedOrder = Math.min(targetOrder, withoutCurrent.length);
    const reordered = [
      ...withoutCurrent.slice(0, clampedOrder),
      current,
      ...withoutCurrent.slice(clampedOrder),
    ];
    await Promise.all(
      reordered.map((column, order) =>
        db.column.update({ where: { id: column.id }, data: { order } }),
      ),
    );
  }

  private async normalizeColumnOrders(
    db: KanbanDatabase,
    boardId: string,
  ): Promise<void> {
    const columns = await db.column.findMany({
      where: { boardId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    await Promise.all(
      columns.map((column, order) =>
        db.column.update({ where: { id: column.id }, data: { order } }),
      ),
    );
  }

  private async normalizeTaskOrders(
    db: KanbanDatabase,
    columnId: string,
  ): Promise<void> {
    const tasks = await db.task.findMany({
      where: { columnId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    await Promise.all(
      tasks.map((task, order) =>
        db.task.update({ where: { id: task.id }, data: { order } }),
      ),
    );
  }

  private async placeTask(
    db: KanbanDatabase,
    boardId: string,
    taskId: string,
    sourceColumnId: string,
    targetColumnId: string,
    targetOrder: number | undefined,
  ): Promise<void> {
    if (sourceColumnId !== targetColumnId) {
      const sourceTasks = await db.task.findMany({
        where: { columnId: sourceColumnId, id: { not: taskId } },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      await Promise.all(
        sourceTasks.map((task, order) =>
          db.task.update({ where: { id: task.id }, data: { order } }),
        ),
      );
    }

    const targetTasks = await db.task.findMany({
      where: {
        columnId: targetColumnId,
        id: { not: taskId },
        column: { boardId },
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const clampedOrder = Math.min(
      targetOrder ?? targetTasks.length,
      targetTasks.length,
    );
    const reordered = [
      ...targetTasks.slice(0, clampedOrder),
      { id: taskId },
      ...targetTasks.slice(clampedOrder),
    ];
    await Promise.all(
      reordered.map((task, order) =>
        db.task.update({
          where: { id: task.id },
          data: { columnId: targetColumnId, order },
        }),
      ),
    );
  }
}

const taskAssigneeInclude = {
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
};

const boardInclude = {
  columns: {
    orderBy: [{ order: 'asc' as const }, { id: 'asc' as const }],
    include: {
      tasks: {
        orderBy: [{ order: 'asc' as const }, { id: 'asc' as const }],
        include: taskAssigneeInclude,
      },
    },
  },
};

function toBoard(board: {
  id: string;
  title: string;
  projectId: string;
  columns: Array<{
    id: string;
    title: string;
    order: number;
    color: string;
    category: ColumnCategory;
    boardId: string;
    tasks: Array<Parameters<typeof toTask>[0]>;
  }>;
}): KanbanBoard {
  return {
    id: board.id,
    title: board.title,
    projectId: board.projectId,
    columns: board.columns.map(toColumn),
  };
}

function toColumn(column: {
  id: string;
  title: string;
  order: number;
  color: string;
  category: ColumnCategory;
  boardId: string;
  tasks: Array<Parameters<typeof toTask>[0]>;
}): KanbanColumn {
  return {
    id: column.id,
    title: column.title,
    order: column.order,
    color: column.color,
    category: column.category,
    boardId: column.boardId,
    tasks: column.tasks.map(toTask),
  };
}

function toTask(task: {
  id: string;
  code?: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  priority?: TaskPriority;
  dueDate?: Date | null;
  storyPoints?: number | null;
  sprintId?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}): KanbanTask {
  return {
    id: task.id,
    code: task.code ?? 'TASK',
    title: task.title,
    description: task.description,
    order: task.order,
    columnId: task.columnId,
    assigneeId: task.assigneeId,
    priority: task.priority ?? 'MEDIUM',
    dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
    storyPoints: task.storyPoints ?? null,
    sprintId: task.sprintId ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: (task.updatedAt ?? task.createdAt).toISOString(),
    ...(task.assignee !== undefined ? { assignee: task.assignee } : {}),
  };
}

function toDatabaseDate(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}
