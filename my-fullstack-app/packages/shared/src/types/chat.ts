export type ChatConversationKind = "CHANNEL" | "DIRECT";

export interface ChatUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ChatChannel {
  id: string;
  workspaceId: string;
  name: string;
  notice: string | null;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: ChatUserSummary;
  attachments: ChatMessageAttachment[];
}

export interface ChatMessageAttachment {
  id: string;
  messageId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isImage: boolean;
  createdAt: string;
}

export interface ChatConversation {
  kind: ChatConversationKind;
  channel: ChatChannel;
  title: string;
  description: string;
  directUser?: ChatUserSummary;
}

export interface WorkspaceChatState {
  channels: ChatChannel[];
}

export interface CreateChatMessageInput {
  content: string;
}

export interface CreateChatChannelInput {
  name: string;
}

export interface UpdateChatChannelInput {
  name: string;
}

export interface UpdateChatChannelNoticeInput {
  notice: string | null;
}
