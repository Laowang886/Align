export type NotificationType = "WORKSPACE_CHAT_MESSAGE" | "TASK_ASSIGNED";

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string | null;
  workspaceId: string | null;
  projectId: string | null;
  taskId: string | null;
  messageId: string | null;
  type: NotificationType;
  title: string;
  content: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  items: Notification[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  kanbanNotificationsEnabled: boolean;
  chatNotificationsEnabled: boolean;
}

export type UpdateNotificationPreferencesInput =
  Partial<NotificationPreferences>;
