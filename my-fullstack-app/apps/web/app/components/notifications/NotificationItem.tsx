"use client";

import type { Notification } from "@repo/shared";
import styles from "../../page.module.css";
import Icon from "../Icon";

export default function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onOpen: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={`${styles.notificationItem} ${!notification.isRead ? styles.notificationUnread : ""}`}
    >
      <button
        className={styles.notificationMain}
        type="button"
        onClick={onOpen}
      >
        <span className={styles.notificationTypeIcon}>
          <Icon
            name={notification.type === "TASK_ASSIGNED" ? "board" : "chat"}
            size={16}
          />
        </span>
        <span className={styles.notificationCopy}>
          <b>{notification.title}</b>
          <span>{notification.content}</span>
          <time dateTime={notification.createdAt}>
            {relativeTime(notification.createdAt)}
          </time>
        </span>
        {!notification.isRead && <i className={styles.notificationUnreadDot} />}
      </button>
      <div className={styles.notificationActions}>
        {!notification.isRead && (
          <button
            type="button"
            onClick={onMarkRead}
            aria-label="Mark notification as read"
          >
            <Icon name="check" size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete notification"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </article>
  );
}

export function relativeTime(value: string, now = Date.now()): string {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
