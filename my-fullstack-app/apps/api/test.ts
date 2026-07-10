import type { Task, ChatMessage } from '@repo/shared';

// 示例：定义一个任务列表
export const tasks: Task[] = [
  {
    id: '1',
    title: '完成 Monorepo 配置',
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
    content: '大家好，今天的会议几点开始？',
    createdAt: new Date(),
  },
];
