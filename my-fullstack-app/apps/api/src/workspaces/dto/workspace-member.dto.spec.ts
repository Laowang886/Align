import { BadRequestException } from '@nestjs/common';
import {
  parseTransferOwnershipDto,
  parseUpdateMemberRoleDto,
} from './workspace-member.dto';

describe('workspace member DTO parsing', () => {
  it('accepts ADMIN and MEMBER role updates', () => {
    expect(parseUpdateMemberRoleDto({ role: 'ADMIN' })).toEqual({
      role: 'ADMIN',
    });
    expect(parseUpdateMemberRoleDto({ role: 'MEMBER' })).toEqual({
      role: 'MEMBER',
    });
  });

  it('rejects assigning OWNER through ordinary role updates', () => {
    expect(() => parseUpdateMemberRoleDto({ role: 'OWNER' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects mass-assignment fields', () => {
    expect(() =>
      parseUpdateMemberRoleDto({ role: 'ADMIN', userId: 'forged' }),
    ).toThrow(BadRequestException);
  });

  it('requires a transfer target memberId', () => {
    const memberId = '123e4567-e89b-42d3-a456-426614174000';
    expect(parseTransferOwnershipDto({ memberId })).toEqual({ memberId });
    expect(() => parseTransferOwnershipDto({})).toThrow(BadRequestException);
  });
});
