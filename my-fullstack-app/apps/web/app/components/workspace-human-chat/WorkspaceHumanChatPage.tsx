"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceDetails, WorkspaceMember } from "@repo/shared";
import {
  ApiError,
  humanChatApi,
  workspaceApi,
  type CurrentUser,
} from "../../../lib/api-client";
import styles from "../../page.module.css";
import Icon from "../Icon";
import ChatComposer from "./ChatComposer";
import ChatMessageList from "./ChatMessageList";
import WorkspaceChatSidebar from "./WorkspaceChatSidebar";
import type {
  ChatTarget,
  HumanChatChannel,
  HumanChatDirectConversation,
  HumanChatMessage,
} from "./types";

type WorkspaceHumanChatPageProps = {
  workspace: WorkspaceDetails;
  currentUser: CurrentUser | null;
  onOpenMembers: () => void;
};

export default function WorkspaceHumanChatPage({
  workspace,
  currentUser,
  onOpenMembers,
}: WorkspaceHumanChatPageProps) {
  const [channels, setChannels] = useState<HumanChatChannel[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [directConversations, setDirectConversations] = useState<
    HumanChatDirectConversation[]
  >([]);
  const [activeTarget, setActiveTarget] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<HumanChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingShell, setLoadingShell] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);

  const targetTitle = useMemo(() => {
    if (activeTarget?.type === "channel") return `#${activeTarget.channel.name}`;
    if (activeTarget?.type === "dm")
      return activeTarget.conversation.otherUser.name;
    return "Workspace Chat";
  }, [activeTarget]);

  const loadMessages = useCallback(
    async (target: ChatTarget | null = activeTarget, quiet = false) => {
      if (!target) return;
      if (!quiet) {
        setLoadingMessages(true);
        setMessageError(null);
      }
      try {
        const nextMessages =
          target.type === "channel"
            ? await humanChatApi.listChannelMessages(workspace.id, target.id)
            : await humanChatApi.listDirectMessageMessages(
                workspace.id,
                target.id,
              );
        setMessages(nextMessages);
      } catch (caught: unknown) {
        if (!quiet) {
          setMessageError(getApiMessage(caught, "Unable to load messages."));
        }
      } finally {
        if (!quiet) setLoadingMessages(false);
      }
    },
    [activeTarget, workspace.id],
  );

  const loadShell = useCallback(async () => {
    setLoadingShell(true);
    setError(null);
    try {
      const [loadedChannels, loadedMembers, loadedDms] = await Promise.all([
        humanChatApi.listChannels(workspace.id),
        workspaceApi.members(workspace.id),
        humanChatApi.listDirectMessages(workspace.id),
      ]);
      const sortedChannels = sortChannels(loadedChannels);
      setChannels(sortedChannels);
      setMembers(loadedMembers);
      setDirectConversations(loadedDms);
      setActiveTarget((current) => {
        if (current?.type === "channel") {
          const channel = sortedChannels.find(
            (item) => item.id === current.channel.id,
          );
          return channel ? { type: "channel", id: channel.id, channel } : current;
        }
        if (current?.type === "dm") {
          const conversation = loadedDms.find(
            (item) => item.id === current.conversation.id,
          );
          return conversation
            ? { type: "dm", id: conversation.id, conversation }
            : current;
        }
        const all = sortedChannels.find((channel) => channel.name === "all");
        return all ? { type: "channel", id: all.id, channel: all } : null;
      });
    } catch (caught: unknown) {
      setError(getApiMessage(caught, "Unable to load workspace chat."));
    } finally {
      setLoadingShell(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    void loadShell();
  }, [loadShell]);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    void loadMessages(activeTarget);
  }, [activeTarget, loadMessages]);

  useEffect(() => {
    if (!activeTarget) return;
    const interval = window.setInterval(() => {
      void loadMessages(activeTarget, true);
    }, 12000);

    function handleFocus() {
      void loadMessages(activeTarget, true);
    }

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeTarget, loadMessages]);

  async function handleSelectMember(member: WorkspaceMember) {
    setMessageError(null);
    try {
      const conversation = await humanChatApi.openDirectMessage(
        workspace.id,
        member.id,
      );
      setDirectConversations((items) =>
        upsertDirectConversation(items, conversation),
      );
      setActiveTarget({ type: "dm", id: conversation.id, conversation });
    } catch (caught: unknown) {
      setMessageError(getApiMessage(caught, "Unable to open direct message."));
    }
  }

  async function handleCreateChannel() {
    const name = channelName.trim().replace(/^#/, "");
    if (!name || creatingChannel) return;

    setCreatingChannel(true);
    setError(null);
    try {
      const channel = await humanChatApi.createChannel(workspace.id, { name });
      setChannels((items) => sortChannels(upsertChannel(items, channel)));
      setActiveTarget({ type: "channel", id: channel.id, channel });
      setAddChannelOpen(false);
      setChannelName("");
    } catch (caught: unknown) {
      setError(getApiMessage(caught, "Unable to create channel."));
    } finally {
      setCreatingChannel(false);
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || !activeTarget || sending) return;

    setSending(true);
    setMessageError(null);
    try {
      const message =
        activeTarget.type === "channel"
          ? await humanChatApi.createChannelMessage(
              workspace.id,
              activeTarget.id,
              { content },
            )
          : await humanChatApi.createDirectMessage(workspace.id, activeTarget.id, {
              content,
            });
      setMessages((items) => [...items, message]);
      setDraft("");
      if (activeTarget.type === "dm") {
        const dms = await humanChatApi.listDirectMessages(workspace.id);
        setDirectConversations(dms);
      }
    } catch (caught: unknown) {
      setMessageError(getApiMessage(caught, "Unable to send message."));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={styles.humanChatPage}>
      <WorkspaceChatSidebar
        workspaceName={workspace.name}
        channels={channels}
        members={members}
        directConversations={directConversations}
        currentUserId={currentUser?.id}
        activeTarget={activeTarget}
        search={search}
        loading={loadingShell}
        onSearchChange={setSearch}
        onSelectChannel={(channel) =>
          setActiveTarget({ type: "channel", id: channel.id, channel })
        }
        onSelectMember={(member) => void handleSelectMember(member)}
        onAddChannel={() => setAddChannelOpen(true)}
        onInvitePeople={onOpenMembers}
      />
      <section className={styles.humanChatMain}>
        <header className={styles.humanChatHeader}>
          <div>
            <h1>{targetTitle}</h1>
            <p>
              {activeTarget?.type === "channel"
                ? "Channel messages are visible to workspace members."
                : activeTarget?.type === "dm"
                  ? "Only you and this teammate can read this conversation."
                  : "Choose a channel or direct message."}
            </p>
          </div>
          <button type="button" onClick={() => void loadShell()}>
            <Icon name="activity" size={15} />
            Refresh
          </button>
        </header>
        {error && (
          <div className={styles.humanChatBanner}>
            <Icon name="alert" size={15} />
            {error}
          </div>
        )}
        <ChatMessageList
          target={activeTarget}
          messages={messages}
          loading={loadingMessages}
          error={messageError}
          currentUserId={currentUser?.id}
          onRetry={() => void loadMessages()}
        />
        <ChatComposer
          value={draft}
          disabled={!activeTarget || sending}
          sending={sending}
          placeholder={
            activeTarget
              ? `Message ${targetTitle}`
              : "Select a conversation first"
          }
          onChange={setDraft}
          onSend={() => void handleSend()}
        />
      </section>
      {addChannelOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAddChannelOpen(false);
          }}
        >
          <form
            className={styles.workspaceDialog}
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateChannel();
            }}
          >
            <div className={styles.dialogHeading}>
              <div className={styles.dialogIcon}>
                <Icon name="chat" size={21} />
              </div>
              <div>
                <h2>Add channel</h2>
                <p>Create a workspace channel for shared messages.</p>
              </div>
              <button type="button" onClick={() => setAddChannelOpen(false)}>
                x
              </button>
            </div>
            <div>
              <label>
                Channel name
                <input
                  value={channelName}
                  onChange={(event) => setChannelName(event.target.value)}
                  placeholder="design-review"
                  disabled={creatingChannel}
                />
              </label>
              <div className={styles.dialogActions}>
                <button
                  type="button"
                  onClick={() => setAddChannelOpen(false)}
                  disabled={creatingChannel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!channelName.trim() || creatingChannel}
                >
                  Create
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function getApiMessage(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback;
}

function sortChannels(channels: HumanChatChannel[]) {
  return [...channels].sort((first, second) => {
    if (first.name === "all") return -1;
    if (second.name === "all") return 1;
    return first.name.localeCompare(second.name);
  });
}

function upsertChannel(
  channels: HumanChatChannel[],
  channel: HumanChatChannel,
) {
  return [channel, ...channels.filter((item) => item.id !== channel.id)];
}

function upsertDirectConversation(
  conversations: HumanChatDirectConversation[],
  conversation: HumanChatDirectConversation,
) {
  return [
    conversation,
    ...conversations.filter((item) => item.id !== conversation.id),
  ];
}
