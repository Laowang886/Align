"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from "@repo/shared";
import { notificationApi } from "../../../lib/api-client";

const preferenceKey = ["notifications", "preferences"] as const;

export function useNotificationPreferences(enabled: boolean) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: preferenceKey,
    queryFn: notificationApi.preferences,
    enabled,
    staleTime: 30_000,
  });

  async function update(input: UpdateNotificationPreferencesInput) {
    const previous =
      queryClient.getQueryData<NotificationPreferences>(preferenceKey);
    setActionError(null);
    setSaving(true);
    queryClient.setQueryData<NotificationPreferences>(
      preferenceKey,
      (current) => (current ? { ...current, ...input } : current),
    );
    try {
      const saved = await notificationApi.updatePreferences(input);
      queryClient.setQueryData(preferenceKey, saved);
    } catch (error) {
      queryClient.setQueryData(preferenceKey, previous);
      setActionError("Unable to save notification preferences.");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  return {
    preferences: query.data,
    loading: query.isLoading,
    loadError: query.isError,
    actionError,
    saving,
    update,
    retry: query.refetch,
  };
}
