import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { notificationApi } from "../../../lib/api-client";
import { useNotificationPreferences } from "./useNotificationPreferences";

jest.mock("../../../lib/api-client", () => ({
  notificationApi: {
    preferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

const mockedApi = jest.mocked(notificationApi);
const defaults = {
  notificationsEnabled: true,
  kanbanNotificationsEnabled: true,
  chatNotificationsEnabled: true,
};

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useNotificationPreferences", () => {
  beforeEach(() => {
    mockedApi.preferences.mockResolvedValue(defaults);
    mockedApi.updatePreferences.mockImplementation(async (input) => ({
      ...defaults,
      ...input,
    }));
  });

  it("loads persisted preferences and saves a switch change", async () => {
    const { result } = renderHook(() => useNotificationPreferences(true), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.preferences).toEqual(defaults));

    await act(async () => {
      await result.current.update({ chatNotificationsEnabled: false });
    });

    expect(mockedApi.updatePreferences).toHaveBeenCalledWith({
      chatNotificationsEnabled: false,
    });
    expect(result.current.preferences?.chatNotificationsEnabled).toBe(false);
  });

  it("rolls back an optimistic change when saving fails", async () => {
    mockedApi.updatePreferences.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useNotificationPreferences(true), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.preferences).toEqual(defaults));

    await act(async () => {
      await result.current
        .update({ notificationsEnabled: false })
        .catch(() => undefined);
    });

    expect(result.current.preferences?.notificationsEnabled).toBe(true);
    expect(result.current.actionError).toBe(
      "Unable to save notification preferences.",
    );
  });
});
