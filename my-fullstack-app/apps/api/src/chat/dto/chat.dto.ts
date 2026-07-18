import { BadRequestException } from '@nestjs/common';
import type {
  CreateChatChannelInput,
  CreateChatMessageInput,
  UpdateChatChannelInput,
  UpdateChatChannelNoticeInput,
} from '@repo/shared';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CHANNEL_NAME_LENGTH = 48;
const MAX_CHANNEL_NOTICE_LENGTH = 500;
const CHANNEL_NAME_PATTERN = /^[a-z0-9][a-z0-9-_ ]*$/i;

export function parseCreateChatMessageDto(
  body: unknown,
  options: { allowEmptyContent?: boolean } = {},
): CreateChatMessageInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Message payload is required');
  }

  const content = (body as Record<string, unknown>).content;
  if (content === undefined && options.allowEmptyContent) {
    return { content: '' };
  }
  if (typeof content !== 'string') {
    throw new BadRequestException('Message content is required');
  }

  const trimmed = content.trim();
  if (!trimmed && !options.allowEmptyContent) {
    throw new BadRequestException('Message content is required');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new BadRequestException(
      `Message content must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
    );
  }

  return { content: trimmed };
}

export function parseCreateChatChannelDto(
  body: unknown,
): CreateChatChannelInput {
  return parseChatChannelNameDto(body);
}

export function parseUpdateChatChannelDto(
  body: unknown,
): UpdateChatChannelInput {
  return parseChatChannelNameDto(body, true);
}

export function parseUpdateChatChannelNoticeDto(
  body: unknown,
): UpdateChatChannelNoticeInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Channel notice payload is required');
  }

  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.some((key) => key !== 'notice')) {
    throw new BadRequestException('Only channel notice can be updated');
  }

  const notice = (body as Record<string, unknown>).notice;
  if (notice !== null && typeof notice !== 'string') {
    throw new BadRequestException('Channel notice is required');
  }

  const trimmed = notice?.trim() ?? '';
  if (trimmed.length > MAX_CHANNEL_NOTICE_LENGTH) {
    throw new BadRequestException(
      `Channel notice must be ${MAX_CHANNEL_NOTICE_LENGTH} characters or fewer`,
    );
  }

  return { notice: trimmed.length > 0 ? trimmed : null };
}

function parseChatChannelNameDto(
  body: unknown,
  rejectExtraFields = false,
): CreateChatChannelInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Channel payload is required');
  }

  if (rejectExtraFields) {
    const keys = Object.keys(body as Record<string, unknown>);
    if (keys.some((key) => key !== 'name')) {
      throw new BadRequestException('Only channel name can be updated');
    }
  }

  const name = (body as Record<string, unknown>).name;
  if (typeof name !== 'string') {
    throw new BadRequestException('Channel name is required');
  }

  const normalized = name.trim().replace(/\s+/g, '-').toLowerCase();
  if (!normalized) {
    throw new BadRequestException('Channel name is required');
  }
  if (normalized.startsWith('dm:')) {
    throw new BadRequestException('Channel name is reserved');
  }
  if (normalized.length > MAX_CHANNEL_NAME_LENGTH) {
    throw new BadRequestException(
      `Channel name must be ${MAX_CHANNEL_NAME_LENGTH} characters or fewer`,
    );
  }
  if (!CHANNEL_NAME_PATTERN.test(normalized)) {
    throw new BadRequestException(
      'Channel name can only contain letters, numbers, spaces, hyphens, and underscores',
    );
  }

  return { name: normalized };
}
