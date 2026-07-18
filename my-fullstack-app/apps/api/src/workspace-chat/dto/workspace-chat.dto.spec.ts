import { BadRequestException } from '@nestjs/common';
import {
  parseCreateWorkspaceChatConversationDto,
  parseCreateWorkspaceChatMessageDto,
  parseUpdateWorkspaceChatConversationDto,
} from './workspace-chat.dto';

const projectId = '11111111-1111-4111-8111-111111111111';

describe('workspace chat DTO parsing', () => {
  it('accepts an empty body for an entire workspace conversation', () => {
    expect(parseCreateWorkspaceChatConversationDto({})).toEqual({});
  });

  it('accepts a valid projectId', () => {
    expect(parseCreateWorkspaceChatConversationDto({ projectId })).toEqual({
      projectId,
    });
  });

  it('rejects a non-UUID projectId', () => {
    expect(() =>
      parseCreateWorkspaceChatConversationDto({ projectId: 'project-1' }),
    ).toThrow(BadRequestException);
  });

  it('rejects a null projectId', () => {
    expect(() =>
      parseCreateWorkspaceChatConversationDto({ projectId: null }),
    ).toThrow(BadRequestException);
  });

  it('rejects unknown fields', () => {
    expect(() =>
      parseCreateWorkspaceChatConversationDto({ title: 'Forged' }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-object bodies', () => {
    expect(() => parseCreateWorkspaceChatConversationDto(null)).toThrow(
      BadRequestException,
    );
  });

  it('trims title updates and message content', () => {
    expect(
      parseUpdateWorkspaceChatConversationDto({ title: ' Roadmap ' }),
    ).toEqual({
      title: 'Roadmap',
    });
    expect(parseCreateWorkspaceChatMessageDto({ content: ' Hello ' })).toEqual({
      content: 'Hello',
    });
  });

  it('rejects empty or oversized message content', () => {
    expect(() =>
      parseCreateWorkspaceChatMessageDto({ content: '   ' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateWorkspaceChatMessageDto({ content: 'x'.repeat(20_001) }),
    ).toThrow(BadRequestException);
  });
});
