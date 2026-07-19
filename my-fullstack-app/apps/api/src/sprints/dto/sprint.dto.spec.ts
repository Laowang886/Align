import { BadRequestException } from '@nestjs/common';
import { parseCreateSprintDto, parseUpdateSprintStatusDto } from './sprint.dto';

describe('Sprint DTO parsing', () => {
  it('normalizes a valid sprint', () => {
    expect(
      parseCreateSprintDto({
        name: '  Sprint 1  ',
        goal: '  Ship persistence  ',
        startDate: '2026-07-14',
        endDate: '2026-07-28',
      }),
    ).toEqual({
      name: 'Sprint 1',
      goal: 'Ship persistence',
      startDate: '2026-07-14',
      endDate: '2026-07-28',
    });
  });

  it.each([
    { startDate: '2026-02-30', endDate: '2026-03-01' },
    { startDate: '07/14/2026', endDate: '2026-07-28' },
    { startDate: '2026-07-28', endDate: '2026-07-14' },
  ])('rejects invalid date input %#', (dates) => {
    expect(() => parseCreateSprintDto({ name: 'Sprint 1', ...dates })).toThrow(
      BadRequestException,
    );
  });

  it('only accepts forward status targets', () => {
    expect(parseUpdateSprintStatusDto({ status: 'ACTIVE' })).toEqual({
      status: 'ACTIVE',
    });
    expect(() => parseUpdateSprintStatusDto({ status: 'PLANNED' })).toThrow(
      BadRequestException,
    );
  });
});
