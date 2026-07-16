import { BadRequestException } from '@nestjs/common';
import type { CreateSprintInput, UpdateSprintStatusInput } from '@repo/shared';

const CREATE_KEYS = new Set(['name', 'goal', 'startDate', 'endDate']);
const STATUS_KEYS = new Set(['status']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseCreateSprintDto(value: unknown): CreateSprintInput {
  const body = parseBody(value, CREATE_KEYS);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 100) {
    throw new BadRequestException(
      'Sprint name must be between 2 and 100 characters',
    );
  }

  if (body.goal !== undefined && typeof body.goal !== 'string') {
    throw new BadRequestException('Sprint goal must be a string');
  }
  const goal = typeof body.goal === 'string' ? body.goal.trim() : undefined;
  if (goal && goal.length > 500) {
    throw new BadRequestException('Sprint goal must not exceed 500 characters');
  }

  const startDate = parseDate(body.startDate, 'Start date');
  const endDate = parseDate(body.endDate, 'End date');
  if (endDate < startDate) {
    throw new BadRequestException(
      'End date must be on or after the start date',
    );
  }

  return { name, ...(goal ? { goal } : {}), startDate, endDate };
}

export function parseUpdateSprintStatusDto(
  value: unknown,
): UpdateSprintStatusInput {
  const body = parseBody(value, STATUS_KEYS);
  if (body.status !== 'ACTIVE' && body.status !== 'COMPLETED') {
    throw new BadRequestException('Sprint status must be ACTIVE or COMPLETED');
  }
  return { status: body.status };
}

function parseBody(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  const body = value as Record<string, unknown>;
  const unknownKey = Object.keys(body).find((key) => !allowedKeys.has(key));
  if (unknownKey) {
    throw new BadRequestException(`Unknown sprint field: ${unknownKey}`);
  }
  return body;
}

function parseDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BadRequestException(`${label} must use YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${label} must be a valid date`);
  }
  return value;
}
