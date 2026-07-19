"use client";

import type { Notification } from "@repo/shared";
import styles from "../../page.module.css";
import NotificationItem from "./NotificationItem";

export default function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  error,
  actionError,
  onOpen,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onRetry,
}: {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: boolean;
  actionError: string | null;
  onOpen: (notification: Notification) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <section
      className={styles.notificationDropdown}
      aria-label="Notifications panel"
    >
      <header className={styles.notificationHeader}>
        <div>
          <h2>Notifications</h2>
          {unreadCount > 0 && <span>{unreadCount} unread</span>}
        </div>
        <button
          type="button"
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
        >
          Mark all as read
        </button>
      </header>
      {actionError && (
        <p className={styles.notificationActionError}>{actionError}</p>
      )}
      <div className={styles.notificationList}>
        {loading ? (
          <div
            className={styles.notificationLoading}
            aria-label="Loading notifications"
          >
            <i />
            <i />
            <i />
          </div>
        ) : error ? (
          <div className={styles.notificationState}>
            <p>Unable to load notifications.</p>
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.notificationState}>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={() => onOpen(notification)}
              onMarkRead={() => onMarkRead(notification.id)}
              onDelete={() => onDelete(notification.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
