export interface ChatMessage {
  id: string;
  channelId: string; // 归属的频道/会话ID
  senderId: string;
  content: string;
  createdAt: Date;
  // 如果需要回复功能，可以加上
  replyToId?: string; 
}