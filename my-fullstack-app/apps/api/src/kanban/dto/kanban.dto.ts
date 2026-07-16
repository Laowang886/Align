import { BadRequestException } from '@nestjs/common';

export interface CreateKanbanColumnInput {
  title: string;
}

export interface UpdateKanbanColumnInput {
  title?: string;
  order?: number;
}

export interface DeleteKanbanColumnInput {
  moveTasksToColumnId?: string;
}

export interface CreateKanbanTaskInput {
  title: string;
  description?: string | null;
  columnId: string;
  assigneeId?: string | null;
}

export interface UpdateKanbanTaskInput {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
}

export interface MoveKanbanTaskInput {
  columnId: string;
  order?: number;
}

const COLUMN_CREATE_KEYS = new Set(['title']);
const COLUMN_UPDATE_KEYS = new Set(['title', 'order']);
const COLUMN_DELETE_KEYS = new Set(['moveTasksToColumnId']);
const TASK_CREATE_KEYS = new Set([
  'title',
  'description',
  'columnId',
  'assigneeId',
]);
const TASK_UPDATE_KEYS = new Set(['title', 'description', 'assigneeId']);
const TASK_MOVE_KEYS = new Set(['columnId', 'order']);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCreateKanbanColumnDto(
  value: unknown,
): CreateKanbanColumnInput {
  const body = parseBody(value, COLUMN_CREATE_KEYS, 'column');
  return { title: parseTitle(body.title, 'Column title') };
}

export function parseUpdateKanbanColumnDto(
  value: unknown,
): UpdateKanbanColumnInput {
  const body = parseBody(value, COLUMN_UPDATE_KEYS, 'column');
  const hasTitle = Object.hasOwn(body, 'title');
  const hasOrder = Object.hasOwn(body, 'order');
  if (!hasTitle && !hasOrder) {
    throw new BadRequestException('At least one column field is required');
  }
  return {
    ...(hasTitle ? { title: parseTitle(body.title, 'Column title') } : {}),
    ...(hasOrder ? { order: parseOrder(body.order) } : {}),
  };
}

export function parseDeleteKanbanColumnDto(
  value: unknown,
): DeleteKanbanColumnInput {
  if (value === undefined) return {};
  const body = parseBody(value, COLUMN_DELETE_KEYS, 'column');
  if (!Object.hasOwn(body, 'moveTasksToColumnId')) return {};
  const moveTasksToColumnId = parseOptionalUuid(
    body.moveTasksToColumnId,
    'moveTasksToColumnId',
  );
  return moveTasksToColumnId ? { moveTasksToColumnId } : {};
}

export function parseCreateKanbanTaskDto(
  value: unknown,
): CreateKanbanTaskInput {
  const body = parseBody(value, TASK_CREATE_KEYS, 'task');
  return {
    title: parseTitle(body.title, 'Task title'),
    ...(Object.hasOwn(body, 'description')
      ? { description: parseNullableDescription(body.description) }
      : {}),
    columnId: parseUuid(body.columnId, 'columnId'),
    ...(Object.hasOwn(body, 'assigneeId')
      ? { assigneeId: parseOptionalUuid(body.assigneeId, 'assigneeId') }
      : {}),
  };
}

export function parseUpdateKanbanTaskDto(
  value: unknown,
): UpdateKanbanTaskInput {
  const body = parseBody(value, TASK_UPDATE_KEYS, 'task');
  const hasTitle = Object.hasOwn(body, 'title');
  const hasDescription = Object.hasOwn(body, 'description');
  const hasAssignee = Object.hasOwn(body, 'assigneeId');
  if (!hasTitle && !hasDescription && !hasAssignee) {
    throw new BadRequestException('At least one task field is required');
  }
  return {
    ...(hasTitle ? { title: parseTitle(body.title, 'Task title') } : {}),
    ...(hasDescription
      ? { description: parseNullableDescription(body.description) }
      : {}),
    ...(hasAssignee
      ? { assigneeId: parseOptionalUuid(body.assigneeId, 'assigneeId') }
      : {}),
  };
}

export function parseMoveKanbanTaskDto(value: unknown): MoveKanbanTaskInput {
  const body = parseBody(value, TASK_MOVE_KEYS, 'task');
  if (!Object.hasOwn(body, 'columnId')) {
    throw new BadRequestException('columnId is required');
  }
  return {
    columnId: parseUuid(body.columnId, 'columnId'),
    ...(Object.hasOwn(body, 'order') ? { order: parseOrder(body.order) } : {}),
  };
}

function parseBody(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  resource: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  const body = value as Record<string, unknown>;
  const unknownKey = Object.keys(body).find((key) => !allowedKeys.has(key));
  if (unknownKey) {
    throw new BadRequestException(`Unknown ${resource} field: ${unknownKey}`);
  }
  return body;
}

function parseTitle(value: unknown, label: string): string {
  const title = typeof value === 'string' ? value.trim() : '';
  if (title.length < 1 || title.length > 160) {
    throw new BadRequestException(
      `${label} must be between 1 and 160 characters`,
    );
  }
  return title;
}

function parseNullableDescription(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Task description must be a string or null');
  }
  const description = value.trim();
  if (description.length > 2000) {
    throw new BadRequestException(
      'Task description must not exceed 2000 characters',
    );
  }
  return description || null;
}

function parseOrder(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new BadRequestException('Order must be a non-negative integer');
  }
  return value;
}

function parseOptionalUuid(value: unknown, field: string): string | null {
  if (value === null) return null;
  return parseUuid(value, field);
}

function parseUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value;
}
