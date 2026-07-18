"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ApiError,
  workspaceChatApi,
  type WorkspaceChatConversationSummary,
} from "../../../lib/api-client";
import styles from "../../page.module.css";
import Icon from "../Icon";
import { useWorkspaceChat } from "./WorkspaceChatContext";

type WorkspaceChatWidgetProps = {
  workspaceId?: string;
  activeProject?: {
    id: string;
    name: string;
    key: string;
  } | null;
  embedded?: boolean;
  onCollapseToWidget?: () => void;
  onOpenFullscreen?: () => void;
};

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

const WIDGET_WIDTH = 380;
const WIDGET_HEIGHT = 560;
const MINIMIZED_HEIGHT = 58;
const VIEWPORT_MARGIN = 16;
const MAX_CHAT_TITLE_LENGTH = 160;

export default function WorkspaceChatWidget({
  workspaceId,
  activeProject,
  embedded = false,
  onCollapseToWidget,
  onOpenFullscreen,
}: WorkspaceChatWidgetProps) {
  const chat = useWorkspaceChat();
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const chatNameInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<WorkspaceChatConversationSummary[]>([]);
  const loadedWorkspaceIdRef = useRef<string | null>(null);
  const conversationsLoadedWorkspaceIdRef = useRef<string | null>(null);
  const loadedMessageConversationIdsRef = useRef<Set<string>>(new Set());
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatName, setChatName] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingTitleConversation, setPendingTitleConversation] =
    useState<WorkspaceChatConversationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const {
    activeConversationId,
    appendMessage,
    closeWidget,
    conversations,
    draft,
    messagesByConversationId,
    minimized,
    open,
    position,
    removeConversation,
    resetWorkspaceChatData,
    setActiveConversationId,
    setConversations,
    setDraft,
    setMessages,
    setPosition,
    upsertConversation,
  } = chat;
  const visible = embedded || open;

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ) ?? null,
    [activeConversationId, conversations],
  );
  const messages = activeConversationId
    ? (messagesByConversationId[activeConversationId] ?? [])
    : [];
  const activeConversationTitle = activeConversation
    ? activeConversation.title || "Untitled conversation"
    : loadingConversations
      ? "Loading chat..."
      : "No active chat";

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (workspaceId === loadedWorkspaceIdRef.current) return;
    loadedWorkspaceIdRef.current = workspaceId ?? null;
    conversationsLoadedWorkspaceIdRef.current = null;
    conversationsRef.current = [];
    loadedMessageConversationIdsRef.current = new Set();
    resetWorkspaceChatData();
    setError(null);
    setHistoryError(null);
    setLoadingConversations(false);
    setLoadingMessages(false);
  }, [resetWorkspaceChatData, workspaceId]);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    if (position) return;
    setPosition(getDefaultPosition());
  }, [position, setPosition, visible, workspaceId]);

  useEffect(() => {
    if (!visible || !workspaceId) {
      setLoadingConversations(false);
      return;
    }
    if (conversationsLoadedWorkspaceIdRef.current === workspaceId) return;

    let cancelled = false;
    setLoadingConversations(true);
    setError(null);
    setHistoryError(null);
    void workspaceChatApi
      .listConversations(workspaceId)
      .then((conversations) => {
        if (cancelled) return;
        conversationsLoadedWorkspaceIdRef.current = workspaceId;
        const incomingConversations = Array.isArray(conversations)
          ? conversations
          : [];
        const activeConversationFromCurrent = activeConversationIdRef.current
          ? findConversation(
              conversationsRef.current,
              activeConversationIdRef.current,
            )
          : null;
        const mergedConversations = activeConversationFromCurrent
          ? upsertConversationList(
              incomingConversations,
              activeConversationFromCurrent,
            )
          : incomingConversations;
        conversationsRef.current = mergedConversations;
        setConversations(mergedConversations);
        setActiveConversationId(
          activeConversationIdRef.current ??
            mergedConversations[0]?.id ??
            null,
        );
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const message = getApiMessage(caught, "Unable to load chat history.");
        setError(message);
        setHistoryError(message);
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    setActiveConversationId,
    setConversations,
    workspaceId,
  ]);

  useEffect(() => {
    if (!visible || !workspaceId || !activeConversationId) {
      setLoadingMessages(false);
      return;
    }
    if (loadedMessageConversationIdsRef.current.has(activeConversationId)) {
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    setError(null);
    void workspaceChatApi
      .getConversation(workspaceId, activeConversationId)
      .then((conversation) => {
        if (cancelled) return;
        loadedMessageConversationIdsRef.current = new Set([
          ...loadedMessageConversationIdsRef.current,
          conversation.id,
        ]);
        setMessages(conversation.id, conversation.messages ?? []);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(getApiMessage(caught, "Unable to load messages."));
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeConversationId,
    setMessages,
    visible,
    workspaceId,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeConversationId]);

  useEffect(() => {
    if (!createDialogOpen) return;
    chatNameInputRef.current?.focus();
  }, [createDialogOpen]);

  useEffect(() => {
    if (!visible || !position || embedded) return;
    const currentPosition = position;

    function handleResize() {
      const height = minimized ? MINIMIZED_HEIGHT : WIDGET_HEIGHT;
      setPosition(clampPosition(currentPosition, WIDGET_WIDTH, height));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [embedded, minimized, position, setPosition, visible]);

  const createConversation = useCallback(async () => {
    if (!workspaceId) throw new Error("Select a workspace first.");

    const conversation = await workspaceChatApi.createConversation(
      workspaceId,
      activeProject?.id,
    );
    conversationsRef.current = upsertConversationList(
      conversationsRef.current,
      conversation,
    );
    upsertConversation(conversation);
    setActiveConversationId(conversation.id);
    setMessages(conversation.id, []);
    loadedMessageConversationIdsRef.current = new Set([
      ...loadedMessageConversationIdsRef.current,
      conversation.id,
    ]);
    return conversation;
  }, [
    activeProject?.id,
    setActiveConversationId,
    setMessages,
    upsertConversation,
    workspaceId,
  ]);

  function handleNewChat() {
    setError(null);
    setCreateError(null);
    setHistoryOpen(false);
    setChatName("");
    setPendingTitleConversation(null);
    setCreateDialogOpen(true);
  }

  function handleCloseCreateDialog() {
    if (creatingConversation) return;
    setCreateDialogOpen(false);
    setCreateError(null);
    setChatName("");
    setPendingTitleConversation(null);
  }

  async function handleCreateNamedChat() {
    if (!workspaceId || creatingConversation) return;

    const title = chatName.trim();
    if (!title || title.length > MAX_CHAT_TITLE_LENGTH) return;

    setCreatingConversation(true);
    setCreateError(null);
    setError(null);

    let conversation = pendingTitleConversation;
    try {
      if (!conversation) {
        conversation = await createConversation();
        setPendingTitleConversation(conversation);
      }

      const updatedConversation = await workspaceChatApi.updateConversationTitle(
        workspaceId,
        conversation.id,
        { title },
      );
      conversationsRef.current = upsertConversationList(
        conversationsRef.current,
        updatedConversation,
      );
      upsertConversation(updatedConversation);
      setActiveConversationId(updatedConversation.id);
      try {
        const fullConversation = await workspaceChatApi.getConversation(
          workspaceId,
          updatedConversation.id,
        );
        loadedMessageConversationIdsRef.current = new Set([
          ...loadedMessageConversationIdsRef.current,
          fullConversation.id,
        ]);
        setMessages(fullConversation.id, fullConversation.messages ?? []);
      } catch (caught: unknown) {
        loadedMessageConversationIdsRef.current = new Set(
          [...loadedMessageConversationIdsRef.current].filter(
            (conversationId) => conversationId !== updatedConversation.id,
          ),
        );
        setError(getApiMessage(caught, "Unable to load messages."));
      }
      setPendingTitleConversation(null);
      setCreateDialogOpen(false);
      setChatName("");
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (caught: unknown) {
      const fallback = conversation
        ? "Conversation was created, but the title could not be saved. Try Create again to save the title."
        : "Unable to create conversation.";
      setCreateError(getApiMessage(caught, fallback));
    } finally {
      setCreatingConversation(false);
    }
  }

  async function handleDeleteConversation() {
    if (!workspaceId || !activeConversationId || deletingConversation) return;

    setDeletingConversation(true);
    setError(null);
    try {
      await workspaceChatApi.deleteConversation(
        workspaceId,
        activeConversationId,
      );
      loadedMessageConversationIdsRef.current = new Set(
        [...loadedMessageConversationIdsRef.current].filter(
          (conversationId) => conversationId !== activeConversationId,
        ),
      );
      conversationsRef.current = conversationsRef.current.filter(
        (conversation) => conversation.id !== activeConversationId,
      );
      removeConversation(activeConversationId);
      setHistoryOpen(false);
      setConfirmDeleteOpen(false);
    } catch (caught: unknown) {
      setError(getApiMessage(caught, "Unable to delete conversation."));
    } finally {
      setDeletingConversation(false);
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending || !workspaceId || !activeConversationId) return;

    setSending(true);
    setError(null);
    try {
      const conversation =
        activeConversation ??
        findConversation(conversations, activeConversationId);
      if (!conversation) return;
      const message = await workspaceChatApi.createMessage(
        workspaceId,
        conversation.id,
        { content },
      );
      appendMessage(conversation.id, message);
      setDraft("");
      const refreshedConversations = await workspaceChatApi
        .listConversations(workspaceId)
        .catch(() => null);
      if (refreshedConversations) {
        conversationsRef.current = refreshedConversations;
        setConversations(refreshedConversations);
      }
    } catch (caught: unknown) {
      setError(getApiMessage(caught, "Unable to save message."));
    } finally {
      setSending(false);
    }
  }

  async function handleSelectHistoryConversation(conversationId: string) {
    if (!workspaceId) return;

    setLoadingMessages(true);
    setError(null);
    try {
      setActiveConversationId(conversationId);
      const conversation = await workspaceChatApi.getConversation(
        workspaceId,
        conversationId,
      );
      loadedMessageConversationIdsRef.current = new Set([
        ...loadedMessageConversationIdsRef.current,
        conversation.id,
      ]);
      setMessages(conversation.id, conversation.messages ?? []);
      setHistoryOpen(false);
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } catch (caught: unknown) {
      setError(getApiMessage(caught, "Unable to load messages."));
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleRetryHistory() {
    if (!workspaceId || loadingConversations) return;

    setLoadingConversations(true);
    setError(null);
    setHistoryError(null);
    try {
      const conversations = await workspaceChatApi.listConversations(workspaceId);
      conversationsLoadedWorkspaceIdRef.current = workspaceId;
      const incomingConversations = Array.isArray(conversations)
        ? conversations
        : [];
      conversationsRef.current = incomingConversations;
      setConversations(incomingConversations);
      setActiveConversationId(
        activeConversationIdRef.current ?? conversations[0]?.id ?? null,
      );
    } catch (caught: unknown) {
      const message = getApiMessage(caught, "Unable to load chat history.");
      setError(message);
      setHistoryError(message);
    } finally {
      setLoadingConversations(false);
    }
  }

  function handleOpenHistory() {
    setHistoryOpen(true);
    void handleRetryHistory();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !position) return;
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = widgetRef.current?.getBoundingClientRect();
    const width = rect?.width ?? WIDGET_WIDTH;
    const height = rect?.height ?? WIDGET_HEIGHT;
    setPosition(
      clampPosition(
        {
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY,
        },
        width,
        height,
      ),
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!visible || !workspaceId) return null;

  const widgetPosition = clampPosition(
    position ?? getDefaultPosition(),
    WIDGET_WIDTH,
    minimized ? MINIMIZED_HEIGHT : WIDGET_HEIGHT,
  );

  return (
    <section
      ref={widgetRef}
      className={`${styles.workspaceChatWidget} ${
        minimized ? styles.workspaceChatWidgetMinimized : ""
      } ${embedded ? styles.workspaceChatWidgetEmbedded : ""}`}
      style={
        embedded
          ? undefined
          : {
              left: widgetPosition.x,
              top: widgetPosition.y,
            }
      }
      aria-label="AI Chat"
    >
      <div
        className={styles.workspaceChatHeader}
        onPointerDown={embedded ? undefined : handlePointerDown}
        onPointerMove={embedded ? undefined : handlePointerMove}
        onPointerUp={embedded ? undefined : handlePointerUp}
        onPointerCancel={embedded ? undefined : handlePointerUp}
      >
        <div className={styles.workspaceChatTitleRow}>
          <h2>AI Chat</h2>
          {embedded && onCollapseToWidget && (
            <button
              type="button"
              onClick={onCollapseToWidget}
              aria-label="Return AI Chat to small window"
              title="Return to small window"
              className={styles.workspaceChatFullscreenButton}
            >
              <Icon name="external" size={14} />
            </button>
          )}
          {!embedded && onOpenFullscreen && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onOpenFullscreen}
              aria-label="Open AI Chat full screen"
              title="Open full screen"
              className={styles.workspaceChatFullscreenButton}
            >
              <Icon name="external" size={14} />
            </button>
          )}
        </div>
        <div className={styles.workspaceChatHeaderActions}>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setConfirmDeleteOpen(true)}
            aria-label="Delete current conversation"
            title="Delete history"
            disabled={!activeConversationId || deletingConversation}
            className={styles.workspaceChatDeleteHistoryButton}
          >
            <Icon name="trash" size={15} />
            <span>Delete history</span>
          </button>
          {!embedded && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={closeWidget}
              aria-label="Close Workspace Chat"
              title="Close"
              className={styles.workspaceChatCloseButton}
            >
              X
            </button>
          )}
        </div>
      </div>

      {(!minimized || embedded) && (
        <>
          <div className={styles.workspaceChatToolbar}>
            <div
              className={styles.workspaceChatActiveTitle}
              aria-label="Current chat"
              title={activeConversationTitle}
            >
              {activeConversationTitle}
            </div>
            <button type="button" onClick={handleNewChat}>
              <Icon name="plus" size={14} />
              New Chat
            </button>
          </div>

          <div className={styles.workspaceChatBody}>
            {error && (
              <div className={styles.workspaceChatError}>
                <Icon name="alert" size={14} />
                {error}
              </div>
            )}
            {loadingMessages && (
              <div className={styles.workspaceChatLoading}>Loading...</div>
            )}
            {!loadingMessages && messages.length === 0 && (
              <div className={styles.workspaceChatEmpty}>
                <Icon name="chat" size={28} />
                <h3>Workspace Chat</h3>
                <p>Messages are saved here.</p>
                <p>AI responses are currently disabled.</p>
              </div>
            )}
            {messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.workspaceChatMessage} ${
                  message.role === "USER"
                    ? styles.workspaceChatMessageUser
                    : styles.workspaceChatMessageAssistant
                }`}
              >
                <p>{message.content}</p>
                <time dateTime={message.createdAt}>
                  {formatMessageTime(message.createdAt)}
                </time>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {historyOpen && (
            <div
              id="workspace-chat-history"
              className={styles.workspaceChatHistoryPanel}
            >
              <div className={styles.workspaceChatHistoryHeader}>
                <span>Chat history</span>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close chat history"
                >
                  X
                </button>
              </div>
              {loadingConversations && (
                <div className={styles.workspaceChatHistoryState}>
                  Loading chat history...
                </div>
              )}
              {!loadingConversations &&
                historyError &&
                conversations.length === 0 && (
                <div className={styles.workspaceChatHistoryState}>
                  <p>Unable to load chat history.</p>
                  <button type="button" onClick={() => void handleRetryHistory()}>
                    Retry
                  </button>
                </div>
              )}
              {!loadingConversations &&
                !historyError &&
                conversations.length === 0 && (
                <div className={styles.workspaceChatHistoryState}>
                  <p>No chat history yet.</p>
                  <small>Create a new chat to get started.</small>
                </div>
              )}
              {!loadingConversations && conversations.length > 0 && (
                <div className={styles.workspaceChatHistoryList}>
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() =>
                        void handleSelectHistoryConversation(conversation.id)
                      }
                      className={
                        conversation.id === activeConversationId
                          ? styles.workspaceChatHistoryItemActive
                          : undefined
                      }
                    >
                      <span>
                        {conversation.title || "Untitled conversation"}
                      </span>
                      <small>{formatHistoryTime(conversation.updatedAt)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form
            className={styles.workspaceChatComposer}
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                activeConversationId
                  ? "Write a message..."
                  : "Create a chat first..."
              }
              disabled={!activeConversationId}
              rows={3}
            />
            <div className={styles.workspaceChatComposerActions}>
              <button
                type="button"
                onClick={handleOpenHistory}
                aria-expanded={historyOpen}
                aria-controls="workspace-chat-history"
                className={styles.workspaceChatHistoryButton}
              >
                <Icon name="clock" size={13} />
                History
              </button>
              <button
                type="submit"
                disabled={
                  !draft.trim() ||
                  sending ||
                  !workspaceId ||
                  !activeConversationId
                }
              >
                Send
              </button>
            </div>
          </form>

          {confirmDeleteOpen && (
            <div
              className={styles.workspaceChatDialogBackdrop}
              role="presentation"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div
                className={styles.workspaceChatConfirmDialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="workspace-chat-delete-title"
              >
                <h3 id="workspace-chat-delete-title">Delete chat history?</h3>
                <p>
                  This will delete the currently selected conversation and its
                  saved messages.
                </p>
                <div className={styles.workspaceChatDialogActions}>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(false)}
                    disabled={deletingConversation}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteConversation()}
                    disabled={deletingConversation}
                    className={styles.workspaceChatDangerButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {createDialogOpen && (
            <div
              className={styles.workspaceChatDialogBackdrop}
              role="presentation"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <form
                className={styles.workspaceChatCreateDialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="workspace-chat-create-title"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateNamedChat();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") handleCloseCreateDialog();
                }}
              >
                <h3 id="workspace-chat-create-title">Create new chat</h3>
                <label>
                  Chat name
                  <input
                    ref={chatNameInputRef}
                    value={chatName}
                    onChange={(event) => {
                      setChatName(
                        event.target.value.slice(0, MAX_CHAT_TITLE_LENGTH),
                      );
                      setCreateError(null);
                    }}
                    placeholder="Enter a chat name"
                    maxLength={MAX_CHAT_TITLE_LENGTH}
                    disabled={creatingConversation}
                  />
                </label>
                {createError && (
                  <div className={styles.workspaceChatError}>
                    <Icon name="alert" size={14} />
                    {createError}
                  </div>
                )}
                <div className={styles.workspaceChatDialogActions}>
                  <button
                    type="button"
                    onClick={handleCloseCreateDialog}
                    disabled={creatingConversation}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !chatName.trim() ||
                      chatName.trim().length > MAX_CHAT_TITLE_LENGTH ||
                      creatingConversation
                    }
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function getDefaultPosition() {
  if (typeof window === "undefined") return { x: 24, y: 24 };

  return clampPosition(
    {
      x: window.innerWidth - WIDGET_WIDTH - 24,
      y: window.innerHeight - WIDGET_HEIGHT - 24,
    },
    WIDGET_WIDTH,
    WIDGET_HEIGHT,
  );
}

function clampPosition(
  position: { x: number; y: number },
  width: number,
  height: number,
) {
  if (typeof window === "undefined") return position;

  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
  const maxY = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - height - VIEWPORT_MARGIN,
  );

  return {
    x: Math.min(Math.max(position.x, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(position.y, VIEWPORT_MARGIN), maxY),
  };
}

function getApiMessage(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

function findConversation(
  conversations: WorkspaceChatConversationSummary[],
  conversationId: string,
) {
  return (
    conversations.find((conversation) => conversation.id === conversationId) ??
    null
  );
}

function upsertConversationList(
  conversations: WorkspaceChatConversationSummary[],
  conversation: WorkspaceChatConversationSummary,
) {
  return [
    conversation,
    ...conversations.filter((current) => current.id !== conversation.id),
  ];
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
