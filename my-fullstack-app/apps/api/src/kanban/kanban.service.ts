import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  tasks: KanbanTask[];
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  createdAt: string;
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
  constructor(private readonly prisma: PrismaService) {}

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
        order: (maxOrder._max.order ?? -1) + 1,
        boardId: board.id,
      },
      include: { tasks: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
    });
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
        },
        include: { tasks: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
      });
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

    const maxOrder = await this.prisma.task.aggregate({
      where: { columnId: input.columnId },
      _max: { order: true },
    });
    const task = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
        columnId: input.columnId,
        assigneeId: input.assigneeId ?? null,
      },
      include: taskAssigneeInclude,
    });
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
      },
      include: taskAssigneeInclude,
    });
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
      return toTask(moved);
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

  private async getOrCreateBoard(projectId: string): Promise<{ id: string }> {
    const existing = await this.findBoard(projectId);
    if (existing) return existing;
    return this.prisma.board.create({
      data: { title: 'Kanban', projectId },
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
  boardId: string;
  tasks: Array<Parameters<typeof toTask>[0]>;
}): KanbanColumn {
  return {
    id: column.id,
    title: column.title,
    order: column.order,
    boardId: column.boardId,
    tasks: column.tasks.map(toTask),
  };
}

function toTask(task: {
  id: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  createdAt: Date;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}): KanbanTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    order: task.order,
    columnId: task.columnId,
    assigneeId: task.assigneeId,
    createdAt: task.createdAt.toISOString(),
    ...(task.assignee !== undefined ? { assignee: task.assignee } : {}),
  };
}
