import { BadRequestException } from '@nestjs/common';
import {
  parseCreateWikiDocumentDto,
  parseUpdateWikiDocumentDto,
} from './wiki-document.dto';

describe('wiki document DTO parsing', () => {
  it('normalizes titles without altering Markdown content', () => {
    expect(
      parseCreateWikiDocumentDto({
        title: ' Architecture ',
        content: '# API\n',
      }),
    ).toEqual({ title: 'Architecture', content: '# API\n' });
  });

  it('requires an update field', () => {
    expect(() => parseUpdateWikiDocumentDto({})).toThrow(BadRequestException);
  });

  it('rejects oversized content and mass-assignment fields', () => {
    expect(() =>
      parseUpdateWikiDocumentDto({ content: 'x'.repeat(200 * 1024 + 1) }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateWikiDocumentDto({
        title: 'Page',
        content: '',
        createdById: 'forged',
      }),
    ).toThrow(BadRequestException);
  });
});
