import { BadRequestException } from '@nestjs/common';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '@repo/shared';
import { normalizeSlug } from '../workspaces.service';

const CREATE_KEYS = new Set(['name', 'slug', 'description', 'avatarUrl', 'avatarPreset']);
const AVATAR_PRESETS = new Set(['board', 'users', 'clipboard', 'chat']);
const UPDATE_KEYS = new Set(['name', 'slug', 'description']);

export function parseCreateWorkspaceDto(value: unknown): CreateWorkspaceInput {
  const body = parseBody(value);
  assertKnownKeys(body, CREATE_KEYS);

  const name = parseName(body.name);
  const slug = body.slug === undefined ? undefined : parseSlug(body.slug);
  const description = parseOptionalDescription(body.description);
  const avatarUrl = parseOptionalAvatarUrl(body.avatarUrl);
  const avatarPreset = parseOptionalAvatarPreset(body.avatarPreset);

  return {
    name,
    ...(slug === undefined ? {} : { slug }),
    ...(description === undefined ? {} : { description }),
    ...(avatarUrl === undefined ? {} : { avatarUrl }),
    ...(avatarPreset === undefined ? {} : { avatarPreset }),
  };
}

function parseOptionalAvatarUrl(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.startsWith('/uploads/workspaces/')) {
    throw new BadRequestException('Workspace avatar must be an uploaded image');
  }
  return value;
}

function parseOptionalAvatarPreset(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !AVATAR_PRESETS.has(value)) {
    throw new BadRequestException('Invalid workspace avatar preset');
  }
  return value;
}

export function parseUpdateWorkspaceDto(value: unknown): UpdateWorkspaceInput {
  const body = parseBody(value);
  assertKnownKeys(body, UPDATE_KEYS);

  const hasName = Object.hasOwn(body, 'name');
  const hasSlug = Object.hasOwn(body, 'slug');
  const hasDescription = Object.hasOwn(body, 'description');
  if (!hasName && !hasSlug && !hasDescription) {
    throw new BadRequestException('At least one workspace field is required');
  }

  return {
    ...(hasName ? { name: parseName(body.name) } : {}),
    ...(hasSlug ? { slug: parseSlug(body.slug) } : {}),
    ...(hasDescription
      ? { description: parseNullableDescription(body.description) }
      : {}),
  };
}

function parseBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  return value as Record<string, unknown>;
}

function assertKnownKeys(
  body: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): void {
  const unknownKey = Object.keys(body).find((key) => !allowed.has(key));
  if (unknownKey) {
    throw new BadRequestException(`Unknown workspace field: ${unknownKey}`);
  }
}

function parseName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length < 2 || name.length > 100) {
    throw new BadRequestException(
      'Workspace name must be between 2 and 100 characters',
    );
  }
  return name;
}

function parseSlug(value: unknown): string {
  if (typeof value !== 'string' || value.length > 100) {
    throw new BadRequestException(
      'Workspace slug must be a string of at most 100 characters',
    );
  }
  const slug = normalizeSlug(value);
  if (!slug) {
    throw new BadRequestException(
      'Workspace slug must contain letters or numbers',
    );
  }
  return slug;
}

function parseOptionalDescription(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const description = parseNullableDescription(value);
  return description ?? undefined;
}

function parseNullableDescription(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Workspace description must be a string or null',
    );
  }
  const description = value.trim();
  if (description.length > 500) {
    throw new BadRequestException(
      'Workspace description must not exceed 500 characters',
    );
  }
  return description || null;
}
