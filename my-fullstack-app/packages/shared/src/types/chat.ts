export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  replyToId?: string; 
}