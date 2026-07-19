"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "@repo/shared";
import styles from "../../page.module.css";
import Icon from "../Icon";
import NotificationDropdown from "./NotificationDropdown";
import { useNotifications } from "./useNotifications";

export default function NotificationBell() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const state = useNotifications();

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch {
      setActionError("Could not update the notification. Please try again.");
    }
  }

  async function openNotification(notification: Notification) {
    setActionError(null);
    try {
      await state.markRead(notification.id);
      setOpen(false);
      router.push(notification.link);
    } catch {
      setActionError("Could not mark the notification as read.");
    }
  }

  return (
    <div className={styles.notificationBellWrap} ref={wrapRef}>
      <button
        className={styles.bell}
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" />
        {state.unreadCount > 0 && (
          <span className={styles.notificationBadge}>
            {state.unreadCount > 99 ? "99+" : state.unreadCount}
          </span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          {...state}
          actionError={actionError}
          onOpen={(notification) => void openNotification(notification)}
          onMarkRead={(id) => void run(() => state.markRead(id))}
          onMarkAllRead={() => void run(state.markAllRead)}
          onDelete={(id) => void run(() => state.remove(id))}
          onRetry={() => void state.retry()}
        />
      )}
      {actionError && (
        <div className={styles.toast} role="status">
          <Icon name="alert" size={16} />
          {actionError}
        </div>
      )}
    </div>
  );
}
