"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPage } from "@repo/shared";
import { notificationApi } from "../../../lib/api-client";

const listKey = ["notifications", "latest"] as const;
const countKey = ["notifications", "unread-count"] as const;
const pollingInterval = 25_000;

export function useNotifications() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: listKey,
    queryFn: () => notificationApi.list({ pageSize: 50 }),
    refetchInterval: pollingInterval,
    refetchOnWindowFocus: true,
  });
  const countQuery = useQuery({
    queryKey: countKey,
    queryFn: notificationApi.unreadCount,
    refetchInterval: pollingInterval,
    refetchOnWindowFocus: true,
  });

  function updateNotification(id: string, isRead: boolean) {
    queryClient.setQueryData<NotificationPage>(listKey, (page) =>
      page
        ? {
            ...page,
            items: page.items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    isRead,
                    readAt: isRead ? new Date().toISOString() : null,
                  }
                : item,
            ),
          }
        : page,
    );
  }

  async function markRead(id: string) {
    const page = queryClient.getQueryData<NotificationPage>(listKey);
    const previousCount = countQuery.data?.count ?? 0;
    const wasUnread =
      page?.items.find((item) => item.id === id)?.isRead === false;
    updateNotification(id, true);
    if (wasUnread) {
      queryClient.setQueryData(countKey, {
        count: Math.max(0, previousCount - 1),
      });
    }
    try {
      await notificationApi.markRead(id);
    } catch (error) {
      queryClient.setQueryData(listKey, page);
      queryClient.setQueryData(countKey, { count: previousCount });
      throw error;
    }
  }

  async function markAllRead() {
    const page = queryClient.getQueryData<NotificationPage>(listKey);
    const previousCount = countQuery.data?.count ?? 0;
    queryClient.setQueryData<NotificationPage>(listKey, (current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => ({
              ...item,
              isRead: true,
              readAt: item.readAt ?? new Date().toISOString(),
            })),
          }
        : current,
    );
    queryClient.setQueryData(countKey, { count: 0 });
    try {
      await notificationApi.markAllRead();
    } catch (error) {
      queryClient.setQueryData(listKey, page);
      queryClient.setQueryData(countKey, { count: previousCount });
      throw error;
    }
  }

  async function remove(id: string) {
    const page = queryClient.getQueryData<NotificationPage>(listKey);
    const previousCount = countQuery.data?.count ?? 0;
    const removed = page?.items.find((item) => item.id === id);
    queryClient.setQueryData<NotificationPage>(listKey, (current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => item.id !== id),
            total: Math.max(0, current.total - 1),
          }
        : current,
    );
    if (removed && !removed.isRead) {
      queryClient.setQueryData(countKey, {
        count: Math.max(0, previousCount - 1),
      });
    }
    try {
      await notificationApi.remove(id);
    } catch (error) {
      queryClient.setQueryData(listKey, page);
      queryClient.setQueryData(countKey, { count: previousCount });
      throw error;
    }
  }

  async function retry() {
    await Promise.all([listQuery.refetch(), countQuery.refetch()]);
  }

  return {
    notifications: listQuery.data?.items ?? [],
    unreadCount: countQuery.data?.count ?? 0,
    loading: listQuery.isLoading || countQuery.isLoading,
    error: listQuery.isError || countQuery.isError,
    markRead,
    markAllRead,
    remove,
    retry,
  };
}
