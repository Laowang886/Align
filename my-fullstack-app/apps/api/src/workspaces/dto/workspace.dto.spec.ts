import { BadRequestException } from '@nestjs/common';
import {
  parseCreateWorkspaceDto,
  parseUpdateWorkspaceDto,
} from './workspace.dto';

describe('workspace DTO parsing', () => {
  it('normalizes create input', () => {
    expect(
      parseCreateWorkspaceDto({
        name: ' Format Weaver ',
        slug: ' Format Weaver HQ ',
        description: ' Product workspace ',
      }),
    ).toEqual({
      name: 'Format Weaver',
      slug: 'format-weaver-hq',
      description: 'Product workspace',
    });
  });

  it('rejects mass-assignment fields', () => {
    expect(() =>
      parseCreateWorkspaceDto({
        name: 'Workspace',
        ownerId: 'forged-owner',
      }),
    ).toThrow(BadRequestException);
  });

  it('requires at least one update field', () => {
    expect(() => parseUpdateWorkspaceDto({})).toThrow(BadRequestException);
  });

  it('accepts null to clear a description', () => {
    expect(parseUpdateWorkspaceDto({ description: null })).toEqual({
      description: null,
    });
  });

  it('rejects invalid names and descriptions', () => {
    expect(() => parseCreateWorkspaceDto({ name: 'x' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseUpdateWorkspaceDto({ description: 'x'.repeat(501) }),
    ).toThrow(BadRequestException);
  });
});
