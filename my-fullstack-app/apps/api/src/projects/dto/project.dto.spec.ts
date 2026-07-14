import { BadRequestException } from '@nestjs/common';
import { parseCreateProjectDto } from './project.dto';

describe('project DTO parsing', () => {
  it('normalizes a supported project', () => {
    expect(
      parseCreateProjectDto({
        name: ' Website ',
        key: ' web ',
        description: ' Product site ',
        color: '#6366f1',
      }),
    ).toEqual({
      name: 'Website',
      key: 'WEB',
      description: 'Product site',
      color: '#6366f1',
    });
  });

  it('rejects forged fields and unsupported colors', () => {
    expect(() =>
      parseCreateProjectDto({
        name: 'Website',
        key: 'WEB',
        color: '#000000',
        workspaceId: 'forged',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateProjectDto({
        name: 'Website',
        key: 'WEB',
        color: '#000000',
      }),
    ).toThrow(BadRequestException);
  });
});
