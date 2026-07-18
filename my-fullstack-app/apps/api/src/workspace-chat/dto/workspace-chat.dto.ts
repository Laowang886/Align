import { BadRequestException } from '@nestjs/common';

const CREATE_CONVERSATION_KEYS = new Set(['projectId']);
const UPDATE_CONVERSATION_KEYS = new Set(['title']);
const CREATE_MESSAGE_KEYS = new Set(['content']);
const MAX_MESSAGE_CONTENT_LENGTH = 20_000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateWorkspaceChatConversationInput = {
  projectId?: string;
};

export type UpdateWorkspaceChatConversationInput = {
  title: string;
};

export type CreateWorkspaceChatMessageInput = {
  content: string;
};

export function parseCreateWorkspaceChatConversationDto(
  value: unknown,
): CreateWorkspaceChatConversationInput {
  const body = parseBody(value, CREATE_CONVERSATION_KEYS);

  if (!Object.hasOwn(body, 'projectId')) {
    return {};
  }

  return {
    projectId: parseUuid(body.projectId, 'projectId'),
  };
}

export function parseUpdateWorkspaceChatConversationDto(
  value: unknown,
): UpdateWorkspaceChatConversationInput {
  const body = parseBody(value, UPDATE_CONVERSATION_KEYS);

  return {
    title: parseTrimmedString(body.title, 'title', 1, 160),
  };
}

export function parseCreateWorkspaceChatMessageDto(
  value: unknown,
): CreateWorkspaceChatMessageInput {
  const body = parseBody(value, CREATE_MESSAGE_KEYS);

  return {
    content: parseTrimmedString(
      body.content,
      'content',
      1,
      MAX_MESSAGE_CONTENT_LENGTH,
    ),
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
    throw new BadRequestException(
      `Unknown workspace chat field: ${unknownKey}`,
    );
  }

  return body;
}

function parseUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }

  return value;
}

function parseTrimmedString(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new BadRequestException(
      `${field} must be between ${minLength} and ${maxLength} characters`,
    );
  }

  return trimmed;
}
