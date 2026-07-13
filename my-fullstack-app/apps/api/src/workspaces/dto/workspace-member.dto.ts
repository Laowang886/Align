import { BadRequestException } from '@nestjs/common';
import type {
  InviteWorkspaceMemberInput,
  TransferWorkspaceOwnershipInput,
  UpdateWorkspaceMemberRoleInput,
} from '@repo/shared';

export function parseInviteWorkspaceMemberDto(value: unknown): InviteWorkspaceMemberInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  const body = value as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new BadRequestException('A valid member email is required');
  }
  if (body.role !== 'ADMIN' && body.role !== 'MEMBER') {
    throw new BadRequestException('Role must be ADMIN or MEMBER');
  }
  return { email, role: body.role };
}

export function parseUpdateMemberRoleDto(
  value: unknown,
): UpdateWorkspaceMemberRoleInput {
  const body = parseExactBody(value, new Set(['role']));
  if (body.role !== 'ADMIN' && body.role !== 'MEMBER') {
    throw new BadRequestException('Member role must be ADMIN or MEMBER');
  }
  return { role: body.role };
}

export function parseTransferOwnershipDto(
  value: unknown,
): TransferWorkspaceOwnershipInput {
  const body = parseExactBody(value, new Set(['memberId']));
  if (
    typeof body.memberId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.memberId,
    )
  ) {
    throw new BadRequestException('A target memberId is required');
  }
  return { memberId: body.memberId };
}

function parseExactBody(
  value: unknown,
  allowed: ReadonlySet<string>,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  const body = value as Record<string, unknown>;
  const unknownKey = Object.keys(body).find((key) => !allowed.has(key));
  if (unknownKey)
    throw new BadRequestException(`Unknown member field: ${unknownKey}`);
  return body;
}
