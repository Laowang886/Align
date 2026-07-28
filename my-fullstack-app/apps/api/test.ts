import type { Task, ChatMessage } from '@repo/shared';

// Example: define a task list
export const tasks: Task[] = [
  {
    id: '1',
    title: 'Complete Monorepo configuration',
    status: 'in_progress',
    priority: 'high',
    boardId: 'board-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const chatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    channelId: 'channel-123',
    senderId: 'user-456',
    content: 'Hi everyone, what time does today\'s meeting start?',
    createdAt: new Date(),
  },
];
