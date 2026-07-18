"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  WorkspaceChatConversationSummary,
  WorkspaceChatMessage,
} from "../../../lib/api-client";

type ChatPosition = {
  x: number;
  y: number;
};

type WorkspaceChatState = {
  open: boolean;
  minimized: boolean;
  position: ChatPosition | null;
  activeConversationId: string | null;
  conversations: WorkspaceChatConversationSummary[];
  messagesByConversationId: Record<string, WorkspaceChatMessage[]>;
  draft: string;
};

type WorkspaceChatContextValue = WorkspaceChatState & {
  openWidget: () => void;
  closeWidget: () => void;
  toggleMinimized: () => void;
  setPosition: (position: ChatPosition) => void;
  setActiveConversationId: (conversationId: string | null) => void;
  setConversations: (conversations: WorkspaceChatConversationSummary[]) => void;
  upsertConversation: (conversation: WorkspaceChatConversationSummary) => void;
  removeConversation: (conversationId: string) => void;
  setMessages: (conversationId: string, messages: WorkspaceChatMessage[]) => void;
  appendMessage: (conversationId: string, message: WorkspaceChatMessage) => void;
  setDraft: (draft: string) => void;
  resetWorkspaceChatData: () => void;
};

type WorkspaceChatAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "toggleMinimized" }
  | { type: "setPosition"; position: ChatPosition }
  | { type: "setActiveConversationId"; conversationId: string | null }
  | {
      type: "setConversations";
      conversations: WorkspaceChatConversationSummary[];
    }
  | { type: "upsertConversation"; conversation: WorkspaceChatConversationSummary }
  | { type: "removeConversation"; conversationId: string }
  | {
      type: "setMessages";
      conversationId: string;
      messages: WorkspaceChatMessage[];
    }
  | {
      type: "appendMessage";
      conversationId: string;
      message: WorkspaceChatMessage;
    }
  | { type: "setDraft"; draft: string }
  | { type: "resetWorkspaceChatData" };

const initialState: WorkspaceChatState = {
  open: false,
  minimized: false,
  position: null,
  activeConversationId: null,
  conversations: [],
  messagesByConversationId: {},
  draft: "",
};

const WorkspaceChatContext = createContext<WorkspaceChatContextValue | null>(
  null,
);

function workspaceChatReducer(
  state: WorkspaceChatState,
  action: WorkspaceChatAction,
): WorkspaceChatState {
  switch (action.type) {
    case "open":
      return { ...state, open: true, minimized: false };
    case "close":
      return { ...state, open: false, minimized: false };
    case "toggleMinimized":
      return { ...state, minimized: !state.minimized };
    case "setPosition":
      return { ...state, position: action.position };
    case "setActiveConversationId":
      return { ...state, activeConversationId: action.conversationId };
    case "setConversations":
      return { ...state, conversations: action.conversations };
    case "upsertConversation": {
      const remaining = state.conversations.filter(
        (conversation) => conversation.id !== action.conversation.id,
      );
      return {
        ...state,
        conversations: [action.conversation, ...remaining],
        activeConversationId:
          state.activeConversationId ?? action.conversation.id,
      };
    }
    case "removeConversation": {
      const remaining = state.conversations.filter(
        (conversation) => conversation.id !== action.conversationId,
      );
      const messagesByConversationId = Object.fromEntries(
        Object.entries(state.messagesByConversationId).filter(
          ([conversationId]) => conversationId !== action.conversationId,
        ),
      );

      return {
        ...state,
        conversations: remaining,
        activeConversationId:
          state.activeConversationId === action.conversationId
            ? (remaining[0]?.id ?? null)
            : state.activeConversationId,
        messagesByConversationId,
      };
    }
    case "setMessages":
      return {
        ...state,
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [action.conversationId]: action.messages,
        },
      };
    case "appendMessage":
      return {
        ...state,
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [action.conversationId]: [
            ...(state.messagesByConversationId[action.conversationId] ?? []),
            action.message,
          ],
        },
      };
    case "setDraft":
      return { ...state, draft: action.draft };
    case "resetWorkspaceChatData":
      return {
        ...state,
        activeConversationId: null,
        conversations: [],
        messagesByConversationId: {},
        draft: "",
      };
  }
}

export function WorkspaceChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceChatReducer, initialState);

  const openWidget = useCallback(() => dispatch({ type: "open" }), []);
  const closeWidget = useCallback(() => dispatch({ type: "close" }), []);
  const toggleMinimized = useCallback(
    () => dispatch({ type: "toggleMinimized" }),
    [],
  );
  const setPosition = useCallback(
    (position: ChatPosition) => dispatch({ type: "setPosition", position }),
    [],
  );
  const setActiveConversationId = useCallback(
    (conversationId: string | null) =>
      dispatch({ type: "setActiveConversationId", conversationId }),
    [],
  );
  const setConversations = useCallback(
    (conversations: WorkspaceChatConversationSummary[]) =>
      dispatch({ type: "setConversations", conversations }),
    [],
  );
  const upsertConversation = useCallback(
    (conversation: WorkspaceChatConversationSummary) =>
      dispatch({ type: "upsertConversation", conversation }),
    [],
  );
  const removeConversation = useCallback(
    (conversationId: string) =>
      dispatch({ type: "removeConversation", conversationId }),
    [],
  );
  const setMessages = useCallback(
    (conversationId: string, messages: WorkspaceChatMessage[]) =>
      dispatch({ type: "setMessages", conversationId, messages }),
    [],
  );
  const appendMessage = useCallback(
    (conversationId: string, message: WorkspaceChatMessage) =>
      dispatch({ type: "appendMessage", conversationId, message }),
    [],
  );
  const setDraft = useCallback(
    (draft: string) => dispatch({ type: "setDraft", draft }),
    [],
  );
  const resetWorkspaceChatData = useCallback(
    () => dispatch({ type: "resetWorkspaceChatData" }),
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      openWidget,
      closeWidget,
      toggleMinimized,
      setPosition,
      setActiveConversationId,
      setConversations,
      upsertConversation,
      removeConversation,
      setMessages,
      appendMessage,
      setDraft,
      resetWorkspaceChatData,
    }),
    [
      appendMessage,
      closeWidget,
      openWidget,
      removeConversation,
      resetWorkspaceChatData,
      setActiveConversationId,
      setConversations,
      setDraft,
      setMessages,
      setPosition,
      state,
      toggleMinimized,
      upsertConversation,
    ],
  );

  return (
    <WorkspaceChatContext.Provider value={value}>
      {children}
    </WorkspaceChatContext.Provider>
  );
}

export function useWorkspaceChat() {
  const context = useContext(WorkspaceChatContext);

  if (!context) {
    throw new Error(
      "useWorkspaceChat must be used inside WorkspaceChatProvider",
    );
  }

  return context;
}
