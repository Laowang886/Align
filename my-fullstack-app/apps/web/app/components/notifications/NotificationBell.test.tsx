import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Notification } from "@repo/shared";
import NotificationBell from "./NotificationBell";
import { useNotifications } from "./useNotifications";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("./useNotifications", () => ({ useNotifications: jest.fn() }));

const mockedUseNotifications = jest.mocked(useNotifications);
const notification: Notification = {
  id: "notification-1",
  recipientId: "user-1",
  actorId: "user-2",
  workspaceId: "workspace-1",
  projectId: "project-1",
  taskId: "task-1",
  messageId: null,
  type: "TASK_ASSIGNED",
  title: "Task assigned to you",
  content: "Alice assigned TASK-123 to you",
  link: "/projects/project-1/kanban?taskId=task-1",
  isRead: false,
  createdAt: new Date().toISOString(),
  readAt: null,
};

function notificationState(overrides: Record<string, unknown> = {}) {
  return {
    notifications: [notification],
    unreadCount: 3,
    loading: false,
    error: false,
    markRead: jest.fn(() => Promise.resolve()),
    markAllRead: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    retry: jest.fn(() => Promise.resolve()),
    ...overrides,
  } as ReturnType<typeof useNotifications>;
}

describe("NotificationBell", () => {
  beforeEach(() => {
    push.mockReset();
    mockedUseNotifications.mockReturnValue(notificationState());
  });

  it("shows the unread badge and opens the panel", () => {
    render(<NotificationBell />);
    expect(screen.getByText("3")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Task assigned to you")).toBeInTheDocument();
  });

  it("marks all as read from the panel", () => {
    mockedUseNotifications.mockImplementation(() => {
      const [unreadCount, setUnreadCount] = useState(3);
      return notificationState({
        unreadCount,
        markAllRead: async () => setUnreadCount(0),
      });
    });
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getByText("Mark all as read"));
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("decrements the badge after marking one unread item read", () => {
    mockedUseNotifications.mockImplementation(() => {
      const [unreadCount, setUnreadCount] = useState(2);
      return notificationState({
        unreadCount,
        markRead: async () => setUnreadCount((count) => count - 1),
      });
    });
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getByLabelText("Mark notification as read"));
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("marks a notification read before navigating", async () => {
    const markRead = jest.fn(() => Promise.resolve());
    mockedUseNotifications.mockReturnValue(notificationState({ markRead }));
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getByText("Task assigned to you"));
    await waitFor(() =>
      expect(markRead).toHaveBeenCalledWith("notification-1"),
    );
    expect(push).toHaveBeenCalledWith(notification.link);
  });

  it.each([
    [{ notifications: [], unreadCount: 0 }, "No notifications yet"],
    [{ loading: true }, "Loading notifications"],
    [{ error: true }, "Unable to load notifications."],
  ])("renders panel state", (overrides, expected) => {
    mockedUseNotifications.mockReturnValue(notificationState(overrides));
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText("Notifications"));
    const element =
      expected === "Loading notifications"
        ? screen.getByLabelText(expected)
        : screen.getByText(expected);
    expect(element).toBeInTheDocument();
  });
});
