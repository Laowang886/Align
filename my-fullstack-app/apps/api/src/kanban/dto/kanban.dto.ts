import { BadRequestException } from '@nestjs/common';
import type { ColumnCategory, TaskPriority } from '@repo/shared';

export interface CreateKanbanColumnInput {
  title: string;
  color?: string;
  category?: ColumnCategory;
}

export interface UpdateKanbanColumnInput {
  title?: string;
  color?: string;
  category?: ColumnCategory;
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
  priority?: TaskPriority;
  dueDate?: string | null;
  storyPoints?: number | null;
  sprintId?: string | null;
}

export interface UpdateKanbanTaskInput {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  storyPoints?: number | null;
  sprintId?: string | null;
}

export interface MoveKanbanTaskInput {
  columnId: string;
  order?: number;
}

const COLUMN_CREATE_KEYS = new Set(['title', 'color', 'category']);
const COLUMN_UPDATE_KEYS = new Set(['title', 'color', 'category', 'order']);
const COLUMN_DELETE_KEYS = new Set(['moveTasksToColumnId']);
const TASK_CREATE_KEYS = new Set([
  'title',
  'description',
  'columnId',
  'assigneeId',
  'priority',
  'dueDate',
  'storyPoints',
  'sprintId',
]);
const TASK_UPDATE_KEYS = new Set([
  'title',
  'description',
  'assigneeId',
  'priority',
  'dueDate',
  'storyPoints',
  'sprintId',
]);
const TASK_MOVE_KEYS = new Set(['columnId', 'order']);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCreateKanbanColumnDto(
  value: unknown,
): CreateKanbanColumnInput {
  const body = parseBody(value, COLUMN_CREATE_KEYS, 'column');
  return {
    title: parseTitle(body.title, 'Column title'),
    ...(Object.hasOwn(body, 'color') ? { color: parseColor(body.color) } : {}),
    ...(Object.hasOwn(body, 'category')
      ? { category: parseCategory(body.category) }
      : {}),
  };
}

export function parseUpdateKanbanColumnDto(
  value: unknown,
): UpdateKanbanColumnInput {
  const body = parseBody(value, COLUMN_UPDATE_KEYS, 'column');
  const hasTitle = Object.hasOwn(body, 'title');
  const hasOrder = Object.hasOwn(body, 'order');
  const hasColor = Object.hasOwn(body, 'color');
  const hasCategory = Object.hasOwn(body, 'category');
  if (!hasTitle && !hasOrder && !hasColor && !hasCategory) {
    throw new BadRequestException('At least one column field is required');
  }
  return {
    ...(hasTitle ? { title: parseTitle(body.title, 'Column title') } : {}),
    ...(hasColor ? { color: parseColor(body.color) } : {}),
    ...(hasCategory ? { category: parseCategory(body.category) } : {}),
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
    ...(Object.hasOwn(body, 'priority')
      ? { priority: parsePriority(body.priority) }
      : {}),
    ...(Object.hasOwn(body, 'dueDate')
      ? { dueDate: parseOptionalDate(body.dueDate) }
      : {}),
    ...(Object.hasOwn(body, 'storyPoints')
      ? { storyPoints: parseStoryPoints(body.storyPoints) }
      : {}),
    ...(Object.hasOwn(body, 'sprintId')
      ? { sprintId: parseOptionalUuid(body.sprintId, 'sprintId') }
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
  const hasPriority = Object.hasOwn(body, 'priority');
  const hasDueDate = Object.hasOwn(body, 'dueDate');
  const hasStoryPoints = Object.hasOwn(body, 'storyPoints');
  const hasSprint = Object.hasOwn(body, 'sprintId');
  if (
    !hasTitle &&
    !hasDescription &&
    !hasAssignee &&
    !hasPriority &&
    !hasDueDate &&
    !hasStoryPoints &&
    !hasSprint
  ) {
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
    ...(hasPriority ? { priority: parsePriority(body.priority) } : {}),
    ...(hasDueDate ? { dueDate: parseOptionalDate(body.dueDate) } : {}),
    ...(hasStoryPoints
      ? { storyPoints: parseStoryPoints(body.storyPoints) }
      : {}),
    ...(hasSprint
      ? { sprintId: parseOptionalUuid(body.sprintId, 'sprintId') }
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

function parsePriority(value: unknown): TaskPriority {
  if (
    value === 'URGENT' ||
    value === 'HIGH' ||
    value === 'MEDIUM' ||
    value === 'LOW'
  )
    return value;
  throw new BadRequestException(
    'priority must be URGENT, HIGH, MEDIUM, or LOW',
  );
}

function parseCategory(value: unknown): ColumnCategory {
  if (
    value === 'BACKLOG' ||
    value === 'TODO' ||
    value === 'IN_PROGRESS' ||
    value === 'REVIEW' ||
    value === 'DONE'
  )
    return value;
  throw new BadRequestException('category is invalid');
}

function parseColor(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z]{3,20}$/.test(value)) {
    throw new BadRequestException('color must be a simple color name');
  }
  return value;
}

function parseOptionalDate(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  ) {
    throw new BadRequestException('dueDate must be YYYY-MM-DD or null');
  }
  return value;
}

function parseStoryPoints(value: unknown): number | null {
  if (value === null || value === '') return null;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new BadRequestException(
      'storyPoints must be an integer between 0 and 100 or null',
    );
  }
  return value;
}

function parseUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value;
}
