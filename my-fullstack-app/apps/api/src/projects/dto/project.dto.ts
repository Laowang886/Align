import { BadRequestException } from '@nestjs/common';
import type { CreateProjectInput } from '@repo/shared';

const PROJECT_KEYS = new Set(['name', 'key', 'description', 'color']);
const PROJECT_COLORS = new Set([
  '#6366f1',
  '#10b981',
  '#e11d48',
  '#f59e0b',
  '#a855f7',
  '#0ea5e9',
]);

export function parseCreateProjectDto(value: unknown): CreateProjectInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  const body = value as Record<string, unknown>;
  const unknownKey = Object.keys(body).find((key) => !PROJECT_KEYS.has(key));
  if (unknownKey) {
    throw new BadRequestException(`Unknown project field: ${unknownKey}`);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 100) {
    throw new BadRequestException(
      'Project name must be between 2 and 100 characters',
    );
  }
  const key = typeof body.key === 'string' ? body.key.trim().toUpperCase() : '';
  if (!/^[A-Z][A-Z0-9]{0,5}$/.test(key)) {
    throw new BadRequestException(
      'Project key must be 1-6 letters or numbers and start with a letter',
    );
  }
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  if (body.description !== undefined && typeof body.description !== 'string') {
    throw new BadRequestException('Project description must be a string');
  }
  if (description.length > 500) {
    throw new BadRequestException(
      'Project description must not exceed 500 characters',
    );
  }
  if (typeof body.color !== 'string' || !PROJECT_COLORS.has(body.color)) {
    throw new BadRequestException('Project color is not supported');
  }

  return {
    name,
    key,
    ...(description ? { description } : {}),
    color: body.color,
  };
}
