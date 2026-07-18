import { BadRequestException } from '@nestjs/common';

const CREATE_CHANNEL_KEYS = new Set(['name']);
const CREATE_MESSAGE_KEYS = new Set(['content']);
const MAX_MESSAGE_CONTENT_LENGTH = 20_000;
const CHANNEL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$|^[a-z0-9]$/;

export type CreateHumanChatChannelInput = {
  name: string;
};

export type CreateHumanChatMessageInput = {
  content: string;
};

export function parseCreateHumanChatChannelDto(
  value: unknown,
): CreateHumanChatChannelInput {
  const body = parseBody(value, CREATE_CHANNEL_KEYS);
  const name = parseTrimmedString(body.name, 'name', 1, 40)
    .toLowerCase()
    .replace(/^#/, '');

  if (!CHANNEL_NAME_PATTERN.test(name)) {
    throw new BadRequestException(
      'Channel name must use lowercase letters, numbers, and hyphens',
    );
  }

  return { name };
}

export function parseCreateHumanChatMessageDto(
  value: unknown,
): CreateHumanChatMessageInput {
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
    throw new BadRequestException(`Unknown chat field: ${unknownKey}`);
  }

  return body;
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
