import { BadRequestException } from '@nestjs/common';
import type {
  CreateWikiDocumentInput,
  UpdateWikiDocumentInput,
} from '@repo/shared';

const CREATE_KEYS = new Set(['title', 'content']);
const UPDATE_KEYS = new Set(['title', 'content']);
const MAX_CONTENT_LENGTH = 200 * 1024;

export function parseCreateWikiDocumentDto(
  value: unknown,
): CreateWikiDocumentInput {
  const body = parseBody(value, CREATE_KEYS);
  return {
    title: parseTitle(body.title),
    content: parseContent(body.content),
  };
}

export function parseUpdateWikiDocumentDto(
  value: unknown,
): UpdateWikiDocumentInput {
  const body = parseBody(value, UPDATE_KEYS);
  const hasTitle = Object.hasOwn(body, 'title');
  const hasContent = Object.hasOwn(body, 'content');
  if (!hasTitle && !hasContent) {
    throw new BadRequestException('At least one document field is required');
  }
  return {
    ...(hasTitle ? { title: parseTitle(body.title) } : {}),
    ...(hasContent ? { content: parseContent(body.content) } : {}),
  };
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
    throw new BadRequestException(`Unknown document field: ${unknownKey}`);
  }
  return body;
}

function parseTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : '';
  if (title.length < 1 || title.length > 160) {
    throw new BadRequestException(
      'Document title must be between 1 and 160 characters',
    );
  }
  return title;
}

function parseContent(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Document content must be a string');
  }
  if (value.length > MAX_CONTENT_LENGTH) {
    throw new BadRequestException('Document content must not exceed 200 KB');
  }
  return value;
}
