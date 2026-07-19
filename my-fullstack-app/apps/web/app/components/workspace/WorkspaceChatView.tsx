"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import type {
  ChatChannel,
  ChatConversation,
  ChatMessage,
  ChatMessageAttachment,
  WorkspaceMember,
} from "@repo/shared";
import {
  ApiError,
  chatApi,
  type CurrentUser,
  workspaceApi,
} from "../../../lib/api-client";
import styles from "../../page.module.css";
import Icon from "../Icon";

type Selection =
  | { kind: "channel"; channelId: string }
  | { kind: "direct"; userId: string };

type WorkspaceChatViewProps = {
  workspaceId: string;
  workspaceName: string;
  currentUser: CurrentUser;
  initialChannelId?: string;
  initialDirectUserId?: string;
};

type SettingsView = "main" | "search";

type ChatPreference = "muted" | "showSenderNames";

type HistoryContentType = "files" | "links" | "images";

type MessageUrlResult = {
  message: ChatMessage;
  url: string;
  hostname: string;
};

type MessageAttachmentResult = {
  message: ChatMessage;
  attachment: ChatMessageAttachment;
};

const MAX_CHANNEL_NOTICE_LENGTH = 500;

export default function WorkspaceChatView({
  workspaceId,
  workspaceName,
  currentUser,
  initialChannelId,
  initialDirectUserId,
}: WorkspaceChatViewProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null,
  );
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [createChannelError, setCreateChannelError] = useState<string | null>(
    null,
  );
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<ChatChannel | null>(
    null,
  );
  const [deleteChannelError, setDeleteChannelError] = useState<string | null>(
    null,
  );
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  const [channelToRename, setChannelToRename] = useState<ChatChannel | null>(
    null,
  );
  const [renameChannelName, setRenameChannelName] = useState("");
  const [renameChannelError, setRenameChannelError] = useState<string | null>(
    null,
  );
  const [isRenamingChannel, setIsRenamingChannel] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [channelNoticeInput, setChannelNoticeInput] = useState("");
  const [channelNoticeError, setChannelNoticeError] = useState<string | null>(
    null,
  );
  const [isSavingChannelNotice, setIsSavingChannelNotice] = useState(false);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [clearHistoryError, setClearHistoryError] = useState<string | null>(
    null,
  );
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  const [selectedHistoryTypes, setSelectedHistoryTypes] = useState<
    Set<HistoryContentType>
  >(new Set());
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedHistoryMemberUserIds, setSelectedHistoryMemberUserIds] =
    useState<Set<string>>(new Set());
  const [isHistoryMemberFilterOpen, setIsHistoryMemberFilterOpen] =
    useState(false);
  const [muted, setMuted] = useState(false);
  const [showSenderNames, setShowSenderNames] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const createChannelInputRef = useRef<HTMLInputElement | null>(null);
  const renameChannelInputRef = useRef<HTMLInputElement | null>(null);
  const channelNoticeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageLoadVersionRef = useRef(0);
  const clearingChannelIdRef = useRef<string | null>(null);
  const activeSelectionRef = useRef<Selection | null>(null);

  const activeConversationId = selection
    ? getSelectionStorageId(selection)
    : "none";
  const activeChannel = useMemo(() => {
    if (selection?.kind !== "channel") return null;
    return (
      channels.find((channel) => channel.id === selection.channelId) ?? null
    );
  }, [channels, selection]);
  const activeDirectMember = useMemo(() => {
    if (selection?.kind !== "direct") return null;
    return members.find((member) => member.userId === selection.userId) ?? null;
  }, [members, selection]);
  const activeTitle = conversation?.title ?? "No channel selected";
  const activeDescription =
    conversation?.description ??
    "Create a channel to start a workspace conversation.";
  const activeConversationChannelId = conversation?.channel.id ?? null;
  const clearHistoryTargetName =
    selection?.kind === "direct"
      ? (activeDirectMember?.user.name ?? activeTitle)
      : (activeChannel?.name ?? activeTitle.replace(/^#\s*/, ""));

  const otherMembers = useMemo(
    () => members.filter((member) => member.userId !== currentUser.id),
    [currentUser.id, members],
  );
  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return otherMembers;
    return otherMembers.filter((member) => {
      const haystack = `${member.user.name} ${member.user.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [otherMembers, search]);
  const sortedChannels = useMemo(
    () =>
      [...channels].sort((first, second) =>
        first.name.localeCompare(second.name),
      ),
    [channels],
  );
  const visibleSortedMembers = useMemo(() => visibleMembers, [visibleMembers]);
  const messageUrls = useMemo(() => extractMessageUrls(messages), [messages]);
  const memberFilteredMessageUrls = useMemo(() => {
    if (selectedHistoryMemberUserIds.size === 0) return messageUrls;
    return messageUrls.filter((result) =>
      selectedHistoryMemberUserIds.has(result.message.authorId),
    );
  }, [messageUrls, selectedHistoryMemberUserIds]);
  const messageAttachments = useMemo(
    () => extractMessageAttachments(messages),
    [messages],
  );
  const memberFilteredMessageAttachments = useMemo(() => {
    if (selectedHistoryMemberUserIds.size === 0) return messageAttachments;
    return messageAttachments.filter((result) =>
      selectedHistoryMemberUserIds.has(result.message.authorId),
    );
  }, [messageAttachments, selectedHistoryMemberUserIds]);
  const historyFileResults = useMemo(
    () =>
      filterUrlResults(
        memberFilteredMessageUrls.filter((result) => isFileUrl(result.url)),
        historySearchQuery,
      ),
    [historySearchQuery, memberFilteredMessageUrls],
  );
  const historyLinkResults = useMemo(
    () => filterUrlResults(memberFilteredMessageUrls, historySearchQuery),
    [historySearchQuery, memberFilteredMessageUrls],
  );
  const historyImageResults = useMemo(
    () =>
      filterUrlResults(
        memberFilteredMessageUrls.filter((result) => isImageUrl(result.url)),
        historySearchQuery,
      ),
    [historySearchQuery, memberFilteredMessageUrls],
  );
  const historyAttachmentFileResults = useMemo(
    () =>
      filterAttachmentResults(
        memberFilteredMessageAttachments.filter(
          (result) => !result.attachment.isImage,
        ),
        historySearchQuery,
      ),
    [historySearchQuery, memberFilteredMessageAttachments],
  );
  const historyAttachmentImageResults = useMemo(
    () =>
      filterAttachmentResults(
        memberFilteredMessageAttachments.filter(
          (result) => result.attachment.isImage,
        ),
        historySearchQuery,
      ),
    [historySearchQuery, memberFilteredMessageAttachments],
  );
  const historyMembers = useMemo(() => {
    const query = historySearchQuery.trim().toLowerCase();
    return [...members]
      .sort((first, second) => first.user.name.localeCompare(second.user.name))
      .filter((member) => member.user.name.toLowerCase().includes(query));
  }, [historySearchQuery, members]);
  const canSendMessage =
    Boolean(selection) &&
    !sending &&
    !isClearingHistory &&
    (draft.trim().length > 0 || selectedFiles.length > 0);

  useEffect(() => {
    activeSelectionRef.current = selection;
  }, [selection]);

  const loadMessages = useCallback(
    async (nextSelection = selection, quiet = false) => {
      const requestVersion = (messageLoadVersionRef.current += 1);
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      try {
        const state = await chatApi.state(workspaceId);
        if (requestVersion !== messageLoadVersionRef.current) return;
        setChannels(state.channels);
        const firstChannelSelection = state.channels[0]
          ? ({ kind: "channel", channelId: state.channels[0].id } as const)
          : null;
        const resolvedSelection =
          nextSelection?.kind === "channel" &&
          !state.channels.some(
            (channel) => channel.id === nextSelection.channelId,
          )
            ? firstChannelSelection
            : (nextSelection ?? firstChannelSelection);

        if (!resolvedSelection) {
          setSelection(null);
          setConversation(null);
          setMessages([]);
          return;
        }

        if (
          !nextSelection ||
          (nextSelection.kind === "channel" &&
            resolvedSelection.kind === "channel" &&
            nextSelection.channelId !== resolvedSelection.channelId)
        ) {
          setSelection(resolvedSelection);
        }

        if (resolvedSelection.kind === "channel") {
          const [nextConversation, nextMessages] = await Promise.all([
            chatApi.channelConversation(
              workspaceId,
              resolvedSelection.channelId,
            ),
            chatApi.channelMessages(workspaceId, resolvedSelection.channelId),
          ]);
          if (
            requestVersion !== messageLoadVersionRef.current ||
            clearingChannelIdRef.current === resolvedSelection.channelId
          ) {
            return;
          }
          setConversation(nextConversation);
          setMessages(nextMessages);
          return;
        }

        const [nextConversation, nextMessages] = await Promise.all([
          chatApi.directConversation(workspaceId, resolvedSelection.userId),
          chatApi.directMessages(workspaceId, resolvedSelection.userId),
        ]);
        if (
          requestVersion !== messageLoadVersionRef.current ||
          clearingChannelIdRef.current === nextConversation.channel.id
        ) {
          return;
        }
        setConversation(nextConversation);
        setMessages(nextMessages);
      } catch (caught: unknown) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Unable to load workspace chat.",
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [selection, workspaceId],
  );

  useEffect(() => {
    setSelection(null);
    setConversation(null);
    setChannels([]);
    setMessages([]);
    setDraft("");
    setSelectedFiles([]);
    setError(null);
    closeChannelSettings();
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      workspaceApi.members(workspaceId),
      loadMessages(
        selection ??
          (initialDirectUserId
            ? { kind: "direct", userId: initialDirectUserId }
            : initialChannelId
              ? { kind: "channel", channelId: initialChannelId }
              : null),
      ),
    ])
      .then(([nextMembers]) => {
        if (!cancelled) setMembers(nextMembers);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load workspace members.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    initialChannelId,
    initialDirectUserId,
    loadMessages,
    selection,
    workspaceId,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadMessages(selection, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadMessages, selection]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selection]);

  useEffect(() => {
    closeChannelSettings();
  }, [selection]);

  useEffect(() => {
    if (!isCreateChannelOpen) return;
    createChannelInputRef.current?.focus();
  }, [isCreateChannelOpen]);

  useEffect(() => {
    if (!channelToRename) return;
    renameChannelInputRef.current?.focus();
    renameChannelInputRef.current?.select();
  }, [channelToRename]);

  useEffect(() => {
    if (!isNoticeModalOpen) return;
    channelNoticeTextareaRef.current?.focus();
    channelNoticeTextareaRef.current?.select();
  }, [isNoticeModalOpen]);

  useEffect(() => {
    if (
      !isCreateChannelOpen &&
      !channelToDelete &&
      !channelToRename &&
      !isNoticeModalOpen &&
      !isClearHistoryOpen &&
      !isChannelSettingsOpen
    ) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (
        isCreatingChannel ||
        isDeletingChannel ||
        isRenamingChannel ||
        isSavingChannelNotice ||
        isClearingHistory
      ) {
        return;
      }
      if (isClearHistoryOpen) {
        setIsClearHistoryOpen(false);
        setClearHistoryError(null);
        return;
      }
      if (isNoticeModalOpen) {
        setIsNoticeModalOpen(false);
        setChannelNoticeInput("");
        setChannelNoticeError(null);
        return;
      }
      if (channelToRename) {
        setChannelToRename(null);
        setRenameChannelName("");
        setRenameChannelError(null);
        return;
      }
      if (channelToDelete) {
        setChannelToDelete(null);
        setDeleteChannelError(null);
        return;
      }
      if (isCreateChannelOpen) {
        setIsCreateChannelOpen(false);
        setNewChannelName("");
        setCreateChannelError(null);
        return;
      }
      if (isChannelSettingsOpen) {
        setIsChannelSettingsOpen(false);
        setSettingsView("main");
        setHistorySearchQuery("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    channelToDelete,
    channelToRename,
    isChannelSettingsOpen,
    isClearHistoryOpen,
    isCreateChannelOpen,
    isClearingHistory,
    isCreatingChannel,
    isDeletingChannel,
    isNoticeModalOpen,
    isRenamingChannel,
    isSavingChannelNotice,
  ]);

  useEffect(() => {
    setMuted(
      readPreference(
        workspaceId,
        currentUser.id,
        activeConversationId,
        "muted",
        false,
      ),
    );
    setShowSenderNames(
      readPreference(
        workspaceId,
        currentUser.id,
        activeConversationId,
        "showSenderNames",
        true,
      ),
    );
  }, [activeConversationId, currentUser.id, workspaceId]);

  function selectChannel(channelId: string) {
    setSelection({ kind: "channel", channelId });
  }

  function selectDirect(userId: string) {
    setSelection({ kind: "direct", userId });
  }

  function openCreateChannelModal() {
    setCreateChannelError(null);
    setIsCreateChannelOpen(true);
  }

  function closeCreateChannelModal() {
    if (isCreatingChannel) return;
    setIsCreateChannelOpen(false);
    setNewChannelName("");
    setCreateChannelError(null);
  }

  async function createChannel(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isCreatingChannel) return;
    const trimmed = newChannelName.trim();
    if (!trimmed) return;

    setIsCreatingChannel(true);
    setCreateChannelError(null);
    try {
      const created = await chatApi.createChannel(workspaceId, {
        name: trimmed,
      });
      setChannels((items) =>
        [...items.filter((item) => item.id !== created.id), created].sort(
          (first, second) => first.name.localeCompare(second.name),
        ),
      );
      const nextSelection: Selection = {
        kind: "channel",
        channelId: created.id,
      };
      setSelection(nextSelection);
      setDraft("");
      setSelectedFiles([]);
      await loadMessages(nextSelection);
      setIsCreateChannelOpen(false);
      setNewChannelName("");
      setCreateChannelError(null);
    } catch (caught: unknown) {
      setCreateChannelError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to create channel.",
      );
    } finally {
      setIsCreatingChannel(false);
    }
  }

  function closeDeleteChannelModal() {
    if (isDeletingChannel) return;
    setChannelToDelete(null);
    setDeleteChannelError(null);
  }

  function openRenameChannelModal(channel: ChatChannel, event?: MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (isRenamingChannel) return;
    setRenameChannelName(channel.name);
    setRenameChannelError(null);
    setChannelToRename(channel);
  }

  function closeRenameChannelModal() {
    if (isRenamingChannel) return;
    setChannelToRename(null);
    setRenameChannelName("");
    setRenameChannelError(null);
  }

  async function renameChannel(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!channelToRename || isRenamingChannel) return;
    const trimmed = renameChannelName.trim();
    if (!trimmed) {
      setRenameChannelError("Channel name is required");
      return;
    }
    if (trimmed === channelToRename.name) return;

    setIsRenamingChannel(true);
    setRenameChannelError(null);
    try {
      const renamed = await chatApi.renameChannel(
        workspaceId,
        channelToRename.id,
        trimmed,
      );
      setChannels((items) =>
        [...items.filter((item) => item.id !== renamed.id), renamed].sort(
          (first, second) => first.name.localeCompare(second.name),
        ),
      );
      if (
        selection?.kind === "channel" &&
        selection.channelId === channelToRename.id
      ) {
        setConversation((current) =>
          current
            ? {
                ...current,
                channel: renamed,
                title: `# ${renamed.name}`,
                description: `Channel for ${renamed.name}.`,
              }
            : current,
        );
      }
      setChannelToRename(null);
      setRenameChannelName("");
      setRenameChannelError(null);
    } catch (caught: unknown) {
      setRenameChannelError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to rename channel.",
      );
    } finally {
      setIsRenamingChannel(false);
    }
  }

  function openChannelNoticeModal(channel: ChatChannel, event?: MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (isSavingChannelNotice) return;
    setChannelNoticeInput(channel.notice ?? "");
    setChannelNoticeError(null);
    setIsNoticeModalOpen(true);
  }

  function closeChannelNoticeModal() {
    if (isSavingChannelNotice) return;
    setIsNoticeModalOpen(false);
    setChannelNoticeInput("");
    setChannelNoticeError(null);
  }

  async function saveChannelNotice(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!activeChannel || isSavingChannelNotice) return;

    const trimmed = channelNoticeInput.trim();
    if (trimmed.length > MAX_CHANNEL_NOTICE_LENGTH) {
      setChannelNoticeError(
        `Channel notice must be ${MAX_CHANNEL_NOTICE_LENGTH} characters or fewer`,
      );
      return;
    }
    if (trimmed === (activeChannel.notice ?? "")) return;

    setIsSavingChannelNotice(true);
    setChannelNoticeError(null);
    try {
      const updated = await chatApi.updateChannelNotice(
        workspaceId,
        activeChannel.id,
        trimmed.length > 0 ? trimmed : null,
      );
      setChannels((items) =>
        [...items.filter((item) => item.id !== updated.id), updated].sort(
          (first, second) => first.name.localeCompare(second.name),
        ),
      );
      setConversation((current) =>
        current?.kind === "CHANNEL" && current.channel.id === updated.id
          ? { ...current, channel: updated }
          : current,
      );
      setIsNoticeModalOpen(false);
      setChannelNoticeInput("");
      setChannelNoticeError(null);
    } catch (caught: unknown) {
      setChannelNoticeError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to save channel notice.",
      );
    } finally {
      setIsSavingChannelNotice(false);
    }
  }

  function openClearHistoryModal() {
    if (!activeConversationChannelId || isClearingHistory) return;
    setClearHistoryError(null);
    setIsClearHistoryOpen(true);
  }

  function closeClearHistoryModal() {
    if (isClearingHistory) return;
    setIsClearHistoryOpen(false);
    setClearHistoryError(null);
  }

  async function clearChatHistory() {
    if (!activeConversationChannelId || !selection || isClearingHistory) return;
    const channelId = activeConversationChannelId;
    const currentSelection = selection;

    clearingChannelIdRef.current = channelId;
    messageLoadVersionRef.current += 1;
    setIsClearingHistory(true);
    setClearHistoryError(null);
    try {
      await chatApi.clearChannelMessages(workspaceId, channelId);
      const latestSelection = activeSelectionRef.current;
      if (
        latestSelection &&
        selectionsMatch(latestSelection, currentSelection)
      ) {
        setMessages([]);
        setHistorySearchQuery("");
        setSelectedHistoryMemberUserIds(new Set());
        clearingChannelIdRef.current = null;
        await loadMessages(currentSelection, true);
      }
      setIsClearHistoryOpen(false);
      setClearHistoryError(null);
    } catch (caught: unknown) {
      setClearHistoryError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to clear chat history.",
      );
    } finally {
      clearingChannelIdRef.current = null;
      setIsClearingHistory(false);
    }
  }

  async function deleteChannel() {
    if (!channelToDelete || isDeletingChannel) return;

    setIsDeletingChannel(true);
    setDeleteChannelError(null);
    try {
      await chatApi.deleteChannel(workspaceId, channelToDelete.id);
      const remainingChannels = channels
        .filter((item) => item.id !== channelToDelete.id)
        .sort((first, second) => first.name.localeCompare(second.name));
      setChannels(() => remainingChannels);
      if (
        selection?.kind === "channel" &&
        selection.channelId === channelToDelete.id
      ) {
        const nextSelection: Selection | null = remainingChannels[0]
          ? { kind: "channel", channelId: remainingChannels[0].id }
          : null;
        setSelection(nextSelection);
        setDraft("");
        setSelectedFiles([]);
        await loadMessages(nextSelection);
      } else if (
        conversation?.kind === "CHANNEL" &&
        conversation.channel.id === channelToDelete.id
      ) {
        setConversation(null);
        setMessages([]);
      }
      setChannelToDelete(null);
      setDeleteChannelError(null);
      closeChannelSettings();
    } catch (caught: unknown) {
      setDeleteChannelError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to delete channel.",
      );
    } finally {
      setIsDeletingChannel(false);
    }
  }

  function closeChannelSettings() {
    setIsChannelSettingsOpen(false);
    setSettingsView("main");
    setSelectedHistoryTypes(new Set());
    setHistorySearchQuery("");
    setSelectedHistoryMemberUserIds(new Set());
    setIsHistoryMemberFilterOpen(false);
  }

  function openChannelSettings() {
    setSettingsView("main");
    setSelectedHistoryTypes(new Set());
    setHistorySearchQuery("");
    setSelectedHistoryMemberUserIds(new Set());
    setIsHistoryMemberFilterOpen(false);
    setIsChannelSettingsOpen(true);
  }

  function toggleHistoryContentType(type: HistoryContentType) {
    setSelectedHistoryTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function toggleHistoryMember(userId: string) {
    setSelectedHistoryMemberUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function updatePreference(preference: ChatPreference, value: boolean) {
    if (preference === "muted") setMuted(value);
    if (preference === "showSenderNames") setShowSenderNames(value);
    writePreference(
      workspaceId,
      currentUser.id,
      activeConversationId,
      preference,
      value,
    );
  }

  function scrollToMessage(messageId: string) {
    closeChannelSettings();
    window.setTimeout(() => {
      document
        .getElementById(`workspace-chat-message-${messageId}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 0);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSendMessage();
  }

  async function handleSendMessage() {
    const content = draft.trim();
    const attachments = selectedFiles;
    if (
      (!content && attachments.length === 0) ||
      sending ||
      isClearingHistory ||
      !selection
    ) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      const created =
        selection.kind === "channel"
          ? await chatApi.sendChannelMessage(
              workspaceId,
              selection.channelId,
              content,
              attachments,
            )
          : await chatApi.sendDirectMessage(
              workspaceId,
              selection.userId,
              content,
              attachments,
            );
      setMessages((items) => [...items, created]);
      setDraft("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError ? caught.message : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setSelectedFiles((current) => [...current, ...files]);
    event.target.value = "";
  }

  function removeSelectedFile(indexToRemove: number) {
    setSelectedFiles((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void handleSendMessage();
    }
  }

  function renderHistoryResults() {
    return (
      <>
        {isHistoryMemberFilterOpen && renderHistoryMembers()}
        {selectedHistoryTypes.size === 0 ? (
          <p className={styles.workspaceChatHistoryEmpty}>
            Select Files, Links, or Images to search this chat.
          </p>
        ) : (
          <>
            {selectedHistoryTypes.has("files") &&
              renderHistoryFileResults(
                historyFileResults,
                historyAttachmentFileResults,
              )}
            {selectedHistoryTypes.has("links") &&
              renderHistoryLinkResults(historyLinkResults)}
            {selectedHistoryTypes.has("images") &&
              renderHistoryImageResults(
                historyImageResults,
                historyAttachmentImageResults,
              )}
          </>
        )}
      </>
    );
  }

  function renderHistoryFileResults(
    results: MessageUrlResult[],
    attachmentResults: MessageAttachmentResult[],
  ) {
    return (
      <div className={styles.workspaceChatSearchResults}>
        {results.length === 0 && attachmentResults.length === 0 ? (
          <p>No files in this chat.</p>
        ) : (
          <>
            {attachmentResults.map((result) => (
              <div
                key={`${result.message.id}:${result.attachment.id}:file`}
                className={styles.workspaceChatHistoryFile}
              >
                <button
                  type="button"
                  onClick={() => scrollToMessage(result.message.id)}
                >
                  <Icon name="file" size={16} />
                  <span>
                    <b>{result.attachment.originalName}</b>
                    <small>
                      {formatFileSize(result.attachment.sizeBytes)} -{" "}
                      {result.message.author.name} -{" "}
                      {formatMessageTime(result.message.createdAt)}
                    </small>
                  </span>
                </button>
                <a
                  href={chatApi.attachmentUrl(
                    workspaceId,
                    result.attachment.id,
                    { download: true },
                  )}
                >
                  Download
                </a>
              </div>
            ))}
            {results.map((result) => (
              <div
                key={`${result.message.id}:${result.url}:file`}
                className={styles.workspaceChatHistoryFile}
              >
                <button
                  type="button"
                  onClick={() => scrollToMessage(result.message.id)}
                >
                  <Icon name="file" size={16} />
                  <span>
                    <b>{getUrlFileName(result.url)}</b>
                    <small>
                      {result.message.author.name} -{" "}
                      {formatMessageTime(result.message.createdAt)}
                    </small>
                  </span>
                </button>
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  function renderHistoryLinkResults(results: MessageUrlResult[]) {
    return (
      <div className={styles.workspaceChatSearchResults}>
        {results.length === 0 ? (
          <p>No links in this chat.</p>
        ) : (
          results.map((result) => (
            <div
              key={`${result.message.id}:${result.url}:link`}
              className={styles.workspaceChatHistoryLink}
            >
              <button
                type="button"
                onClick={() => scrollToMessage(result.message.id)}
              >
                <b>{result.hostname}</b>
                <span>{result.message.content}</span>
                <small>
                  {result.message.author.name} -{" "}
                  {formatMessageTime(result.message.createdAt)}
                </small>
              </button>
              <a href={result.url} target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={14} />
              </a>
            </div>
          ))
        )}
      </div>
    );
  }

  function renderHistoryImageResults(
    results: MessageUrlResult[],
    attachmentResults: MessageAttachmentResult[],
  ) {
    return results.length === 0 && attachmentResults.length === 0 ? (
      <p className={styles.workspaceChatHistoryEmpty}>
        No images in this chat.
      </p>
    ) : (
      <div className={styles.workspaceChatHistoryImageGrid}>
        {attachmentResults.map((result) => (
          <button
            type="button"
            key={`${result.message.id}:${result.attachment.id}:image`}
            className={styles.workspaceChatHistoryImage}
            onClick={() => scrollToMessage(result.message.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chatApi.attachmentUrl(workspaceId, result.attachment.id)}
              alt={result.attachment.originalName}
              loading="lazy"
            />
            <span>
              <b>{result.attachment.originalName}</b>
              <small>
                {result.message.author.name} -{" "}
                {formatMessageTime(result.message.createdAt)}
              </small>
            </span>
          </button>
        ))}
        {results.map((result) => (
          <button
            type="button"
            key={`${result.message.id}:${result.url}:image`}
            className={styles.workspaceChatHistoryImage}
            onClick={() => scrollToMessage(result.message.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt={getUrlFileName(result.url)}
              loading="lazy"
            />
            <span>
              <b>{getUrlFileName(result.url)}</b>
              <small>
                {result.message.author.name} -{" "}
                {formatMessageTime(result.message.createdAt)}
              </small>
            </span>
          </button>
        ))}
      </div>
    );
  }

  function renderHistoryMembers() {
    return (
      <div className={styles.workspaceChatHistoryMembers}>
        {historyMembers.length === 0 ? (
          <p>No matching members.</p>
        ) : (
          historyMembers.map((member) => {
            const isSelected = selectedHistoryMemberUserIds.has(member.user.id);
            return (
              <button
                type="button"
                key={member.id}
                className={`${styles.workspaceChatHistoryMember} ${
                  isSelected ? styles.workspaceChatHistoryMemberSelected : ""
                }`}
                onClick={() => toggleHistoryMember(member.user.id)}
                aria-pressed={isSelected}
              >
                <i className={styles.workspaceChatHistoryMemberAvatar}>
                  {member.user.name.charAt(0).toUpperCase()}
                </i>
                <span>
                  <b>
                    {member.user.name}
                    {member.userId === currentUser.id ? " (you)" : ""}
                  </b>
                  <small>{member.user.email}</small>
                </span>
              </button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <section className={styles.workspaceChatLayout}>
      <aside className={styles.workspaceChatSidebar}>
        <div className={styles.workspaceChatSidebarHeader}>
          <b>Workspace Conversations</b>
          <span>{workspaceName}</span>
        </div>
        <label className={styles.workspaceChatSearch}>
          <span>Search chat</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chat"
          />
        </label>
        <div className={styles.workspaceChatSection}>
          <div className={styles.workspaceChatSectionHeading}>
            <p>Channels</p>
            <button
              type="button"
              className={styles.workspaceChatAddChannel}
              onClick={openCreateChannelModal}
              disabled={isCreatingChannel}
              aria-label="Create channel"
              title="Create channel"
            >
              <Icon name="plus" size={15} />
            </button>
          </div>
          {sortedChannels.map((channel) => (
            <div key={channel.id} className={styles.workspaceChatChannelRow}>
              <button
                type="button"
                className={
                  selection?.kind === "channel" &&
                  selection.channelId === channel.id
                    ? styles.workspaceChatActiveItem
                    : ""
                }
                onClick={() => selectChannel(channel.id)}
              >
                <span>#</span>
                <b>{channel.name}</b>
              </button>
            </div>
          ))}
          {!loading && sortedChannels.length === 0 && <em>No channels yet.</em>}
        </div>
        <div className={styles.workspaceChatSection}>
          <p>Direct Messages</p>
          {visibleSortedMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              className={
                selection?.kind === "direct" &&
                selection.userId === member.userId
                  ? styles.workspaceChatActiveItem
                  : ""
              }
              onClick={() => selectDirect(member.userId)}
            >
              <i>{member.user.name.charAt(0).toUpperCase()}</i>
              <span>
                <b>{member.user.name}</b>
                <small>{member.user.email}</small>
              </span>
            </button>
          ))}
          {!loading && otherMembers.length === 0 && (
            <em>No other members yet.</em>
          )}
          {!loading &&
            otherMembers.length > 0 &&
            visibleMembers.length === 0 && <em>No matching members.</em>}
        </div>
      </aside>
      <div className={styles.workspaceChatMain}>
        <header className={styles.workspaceChatHeader}>
          <div>
            <h2>{activeTitle}</h2>
            <p>{activeDescription}</p>
          </div>
          <button
            type="button"
            className={styles.workspaceChatSettingsButton}
            onClick={openChannelSettings}
            disabled={!conversation}
            aria-label="Settings"
            title="Settings"
          >
            <span aria-hidden="true">•••</span>
          </button>
        </header>
        {error && <div className={styles.workspaceChatError}>{error}</div>}
        <div className={styles.workspaceChatMessages}>
          {loading ? (
            <div className={styles.workspaceChatEmpty}>Loading chat...</div>
          ) : !conversation ? (
            <div className={styles.workspaceChatEmpty}>
              No channels yet. Create one from the Channels list.
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.workspaceChatEmpty}>
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                id={`workspace-chat-message-${message.id}`}
                className={styles.workspaceChatMessage}
              >
                <i>{message.author.name.charAt(0).toUpperCase()}</i>
                <div>
                  <header>
                    {showSenderNames && <b>{message.author.name}</b>}
                    <time dateTime={message.createdAt}>
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </header>
                  {message.content && <p>{message.content}</p>}
                  {(message.attachments ?? []).length > 0 && (
                    <div className={styles.workspaceChatAttachments}>
                      {(message.attachments ?? []).map((attachment) =>
                        attachment.isImage ? (
                          <a
                            key={attachment.id}
                            className={styles.workspaceChatImageAttachment}
                            href={chatApi.attachmentUrl(
                              workspaceId,
                              attachment.id,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={chatApi.attachmentUrl(
                                workspaceId,
                                attachment.id,
                              )}
                              alt={attachment.originalName}
                              loading="lazy"
                            />
                            <span>{attachment.originalName}</span>
                          </a>
                        ) : (
                          <div
                            key={attachment.id}
                            className={styles.workspaceChatFileAttachment}
                          >
                            <Icon name="file" size={18} />
                            <span>
                              <b>{attachment.originalName}</b>
                              <small>
                                {formatFileSize(attachment.sizeBytes)}
                              </small>
                            </span>
                            <a
                              href={chatApi.attachmentUrl(
                                workspaceId,
                                attachment.id,
                                { download: true },
                              )}
                            >
                              Download
                            </a>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <form className={styles.workspaceChatComposer} onSubmit={sendMessage}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className={styles.workspaceChatFileInput}
            onChange={handleFileSelection}
            disabled={!selection || sending || isClearingHistory}
          />
          <div className={styles.workspaceChatComposerBody}>
            {selectedFiles.length > 0 && (
              <div className={styles.workspaceChatSelectedFiles}>
                {selectedFiles.map((file, index) => (
                  <span key={`${file.name}:${file.size}:${index}`}>
                    <Icon name="file" size={14} />
                    <b>{file.name}</b>
                    <small>{formatFileSize(file.size)}</small>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      disabled={sending}
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className={styles.workspaceChatComposerInputRow}>
              <button
                type="button"
                className={styles.workspaceChatUploadButton}
                onClick={openFilePicker}
                disabled={!selection || sending || isClearingHistory}
                aria-label="Attach files"
                title="Attach files"
              >
                <Icon name="file" size={16} />
              </button>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleMessageKeyDown}
                placeholder={
                  selection
                    ? "Write a message"
                    : "Create a channel to start chatting"
                }
                rows={1}
                maxLength={4000}
                disabled={!selection || isClearingHistory}
              />
            </div>
          </div>
          <button type="submit" disabled={!canSendMessage}>
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
      {isChannelSettingsOpen && (
        <div
          className={styles.workspaceChatSettingsOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeChannelSettings();
          }}
        >
          <aside
            className={styles.workspaceChatSettingsPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-chat-settings-title"
          >
            {settingsView === "search" ? (
              <>
                <header className={styles.workspaceChatSettingsHeader}>
                  <button
                    type="button"
                    className={styles.workspaceChatBackButton}
                    onClick={() => setSettingsView("main")}
                    aria-label="Back to settings"
                  >
                    <Icon name="chevron" size={16} />
                  </button>
                  <h3 id="workspace-chat-settings-title">
                    Search chat history
                  </h3>
                  <button
                    type="button"
                    className={styles.workspaceChatPanelClose}
                    onClick={closeChannelSettings}
                    aria-label="Close settings"
                  >
                    ×
                  </button>
                </header>
                <div className={styles.workspaceChatSettingsBody}>
                  <label className={styles.workspaceChatSettingsSearch}>
                    <span>Search</span>
                    <input
                      value={historySearchQuery}
                      onChange={(event) =>
                        setHistorySearchQuery(event.target.value)
                      }
                      placeholder="Search messages or people..."
                      autoFocus
                    />
                  </label>
                  <div
                    className={styles.workspaceChatHistoryTabs}
                    role="group"
                    aria-label="Chat history filters"
                  >
                    {(["files", "links", "images"] as const).map((filter) => {
                      const selected = selectedHistoryTypes.has(filter);
                      return (
                        <button
                          type="button"
                          key={filter}
                          className={`${styles.workspaceChatHistoryTab} ${
                            selected ? styles.workspaceChatHistoryTabActive : ""
                          }`}
                          onClick={() => toggleHistoryContentType(filter)}
                          aria-pressed={selected}
                        >
                          {getHistoryFilterLabel(filter)}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={`${styles.workspaceChatHistoryTab} ${
                        isHistoryMemberFilterOpen ||
                        selectedHistoryMemberUserIds.size > 0
                          ? styles.workspaceChatHistoryTabActive
                          : ""
                      }`}
                      onClick={() =>
                        setIsHistoryMemberFilterOpen((current) => !current)
                      }
                      aria-expanded={isHistoryMemberFilterOpen}
                      aria-pressed={selectedHistoryMemberUserIds.size > 0}
                    >
                      Group members
                    </button>
                  </div>
                  <p className={styles.workspaceChatSettingsHint}>
                    Searching currently loaded messages.
                  </p>
                  {renderHistoryResults()}
                </div>
              </>
            ) : (
              <>
                <header className={styles.workspaceChatSettingsHeader}>
                  <h3 id="workspace-chat-settings-title">Settings</h3>
                  <button
                    type="button"
                    className={styles.workspaceChatPanelClose}
                    onClick={closeChannelSettings}
                    aria-label="Close settings"
                  >
                    ×
                  </button>
                </header>
                <div className={styles.workspaceChatSettingsBody}>
                  <section className={styles.workspaceChatSettingsSection}>
                    {selection?.kind === "direct" ? (
                      <>
                        <span>Conversation</span>
                        <b>{activeDirectMember?.user.name ?? activeTitle}</b>
                        <p>Direct conversation</p>
                      </>
                    ) : (
                      <>
                        <span>Channel name</span>
                        <div className={styles.workspaceChatSettingsNameRow}>
                          <b>
                            {`# ${activeChannel?.name ?? activeTitle.replace(/^#\s*/, "")}`}
                          </b>
                          {selection?.kind === "channel" && activeChannel && (
                            <button
                              type="button"
                              className={styles.workspaceChatSettingsNameAction}
                              onClick={(event) =>
                                openRenameChannelModal(activeChannel, event)
                              }
                              disabled={isRenamingChannel}
                              aria-label={`Rename channel ${activeChannel.name}`}
                              title="Rename channel"
                            >
                              <Icon name="edit" size={14} />
                            </button>
                          )}
                        </div>
                        <div
                          className={styles.workspaceChatSettingsNoticeHeader}
                        >
                          <span>Channel notice</span>
                          {selection?.kind === "channel" && activeChannel && (
                            <button
                              type="button"
                              className={styles.workspaceChatSettingsNameAction}
                              onClick={(event) =>
                                openChannelNoticeModal(activeChannel, event)
                              }
                              disabled={isSavingChannelNotice}
                              aria-label="Edit channel notice"
                              title="Edit channel notice"
                            >
                              <Icon name="edit" size={14} />
                            </button>
                          )}
                        </div>
                        <p className={styles.workspaceChatSettingsNoticeText}>
                          {activeChannel?.notice ?? "No notice has been set."}
                        </p>
                      </>
                    )}
                  </section>
                  <button
                    type="button"
                    className={styles.workspaceChatSettingsNavRow}
                    onClick={() => setSettingsView("search")}
                  >
                    <span>Search chat history</span>
                    <Icon name="chevron" size={16} />
                  </button>
                  <section className={styles.workspaceChatSettingsSection}>
                    <PreferenceSwitch
                      label="Mute notifications"
                      helper="Notifications are not enabled in this version."
                      checked={muted}
                      onChange={(value) => updatePreference("muted", value)}
                    />
                    <PreferenceSwitch
                      label="Show sender names"
                      checked={showSenderNames}
                      onChange={(value) =>
                        updatePreference("showSenderNames", value)
                      }
                    />
                  </section>
                  {conversation && (
                    <button
                      type="button"
                      className={styles.workspaceChatClearHistoryAction}
                      onClick={openClearHistoryModal}
                      disabled={isClearingHistory}
                      aria-label={
                        selection?.kind === "direct"
                          ? "Clear direct message history"
                          : "Clear chat history"
                      }
                    >
                      <b>Clear chat history</b>
                      <span>
                        {selection?.kind === "direct"
                          ? "Delete all messages in this conversation."
                          : "Delete all messages in this channel."}
                      </span>
                    </button>
                  )}
                  {selection?.kind === "channel" && activeChannel && (
                    <button
                      type="button"
                      className={styles.workspaceChatDangerRow}
                      onClick={() => {
                        setDeleteChannelError(null);
                        setChannelToDelete(activeChannel);
                      }}
                    >
                      Delete channel
                    </button>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
      {isCreateChannelOpen && (
        <div
          className={styles.workspaceChatModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateChannelModal();
          }}
        >
          <section
            className={styles.workspaceChatModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-channel-title"
          >
            <header className={styles.workspaceChatModalHeader}>
              <h3 id="create-channel-title">Create channel</h3>
              <button
                type="button"
                onClick={closeCreateChannelModal}
                disabled={isCreatingChannel}
                aria-label="Close create channel"
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void createChannel(event)}>
              <p>Channels are visible to everyone in this workspace.</p>
              <label>
                Channel name
                <input
                  ref={createChannelInputRef}
                  value={newChannelName}
                  onChange={(event) => setNewChannelName(event.target.value)}
                  disabled={isCreatingChannel}
                  placeholder="e.g. team-updates"
                  maxLength={80}
                />
              </label>
              {createChannelError && (
                <small className={styles.workspaceChatModalError}>
                  {createChannelError}
                </small>
              )}
              <footer className={styles.workspaceChatModalFooter}>
                <button
                  type="button"
                  onClick={closeCreateChannelModal}
                  disabled={isCreatingChannel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreatingChannel || newChannelName.trim().length === 0
                  }
                >
                  {isCreatingChannel ? "Creating..." : "Create channel"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {channelToRename && (
        <div
          className={styles.workspaceChatModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRenameChannelModal();
          }}
        >
          <section
            className={`${styles.workspaceChatModal} ${styles.workspaceChatRenameModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-channel-title"
          >
            <header className={styles.workspaceChatModalHeader}>
              <h3 id="rename-channel-title">Rename channel</h3>
              <button
                type="button"
                onClick={closeRenameChannelModal}
                disabled={isRenamingChannel}
                aria-label="Close rename channel"
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void renameChannel(event)}>
              <p>Choose a new name for this channel.</p>
              <label>
                Channel name
                <input
                  ref={renameChannelInputRef}
                  value={renameChannelName}
                  onChange={(event) => {
                    setRenameChannelName(event.target.value);
                    setRenameChannelError(null);
                  }}
                  disabled={isRenamingChannel}
                  placeholder="e.g. team-updates"
                  maxLength={80}
                />
              </label>
              {renameChannelError && (
                <small className={styles.workspaceChatModalError}>
                  {renameChannelError}
                </small>
              )}
              <footer className={styles.workspaceChatModalFooter}>
                <button
                  type="button"
                  onClick={closeRenameChannelModal}
                  disabled={isRenamingChannel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isRenamingChannel ||
                    renameChannelName.trim().length === 0 ||
                    renameChannelName.trim() === channelToRename.name
                  }
                >
                  {isRenamingChannel ? "Saving..." : "Save changes"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {isNoticeModalOpen && activeChannel && (
        <div
          className={styles.workspaceChatModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeChannelNoticeModal();
          }}
        >
          <section
            className={`${styles.workspaceChatModal} ${styles.workspaceChatNoticeModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-channel-notice-title"
          >
            <header className={styles.workspaceChatModalHeader}>
              <h3 id="edit-channel-notice-title">Edit channel notice</h3>
              <button
                type="button"
                onClick={closeChannelNoticeModal}
                disabled={isSavingChannelNotice}
                aria-label="Close edit channel notice"
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void saveChannelNotice(event)}>
              <p>Add a short notice for everyone in this channel.</p>
              <label>
                Channel notice
                <textarea
                  ref={channelNoticeTextareaRef}
                  value={channelNoticeInput}
                  onChange={(event) => {
                    setChannelNoticeInput(event.target.value);
                    setChannelNoticeError(null);
                  }}
                  disabled={isSavingChannelNotice}
                  placeholder="Add a channel notice..."
                  maxLength={MAX_CHANNEL_NOTICE_LENGTH}
                />
              </label>
              {channelNoticeError && (
                <small className={styles.workspaceChatModalError}>
                  {channelNoticeError}
                </small>
              )}
              <footer className={styles.workspaceChatModalFooter}>
                <button
                  type="button"
                  onClick={closeChannelNoticeModal}
                  disabled={isSavingChannelNotice}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingChannelNotice ||
                    channelNoticeInput.trim().length >
                      MAX_CHANNEL_NOTICE_LENGTH ||
                    channelNoticeInput.trim() === (activeChannel.notice ?? "")
                  }
                >
                  {isSavingChannelNotice ? "Saving..." : "Save changes"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {isClearHistoryOpen && conversation && (
        <div
          className={styles.workspaceChatModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeClearHistoryModal();
          }}
        >
          <section
            className={`${styles.workspaceChatModal} ${styles.workspaceChatClearHistoryModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-chat-history-title"
          >
            <header className={styles.workspaceChatModalHeader}>
              <h3 id="clear-chat-history-title">Clear chat history?</h3>
              <button
                type="button"
                onClick={closeClearHistoryModal}
                disabled={isClearingHistory}
                aria-label="Close clear chat history"
              >
                ×
              </button>
            </header>
            <div className={styles.workspaceChatDeleteBody}>
              {selection?.kind === "direct" ? (
                <>
                  <p>
                    All messages in this conversation with{" "}
                    {clearHistoryTargetName} will be permanently deleted for
                    both participants.
                  </p>
                  <p>The conversation itself will not be deleted.</p>
                </>
              ) : (
                <>
                  <p>
                    All messages in #{clearHistoryTargetName} will be
                    permanently deleted.
                  </p>
                  <p>The channel itself will not be deleted.</p>
                </>
              )}
              <p>This action cannot be undone.</p>
              {clearHistoryError && (
                <small className={styles.workspaceChatModalError}>
                  {clearHistoryError}
                </small>
              )}
            </div>
            <footer className={styles.workspaceChatModalFooter}>
              <button
                type="button"
                onClick={closeClearHistoryModal}
                disabled={isClearingHistory}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.workspaceChatDangerButton}
                onClick={() => void clearChatHistory()}
                disabled={isClearingHistory}
              >
                {isClearingHistory ? "Clearing..." : "Clear history"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {channelToDelete && (
        <div
          className={styles.workspaceChatModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteChannelModal();
          }}
        >
          <section
            className={styles.workspaceChatModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-channel-title"
          >
            <header className={styles.workspaceChatModalHeader}>
              <h3 id="delete-channel-title">Delete #{channelToDelete.name}?</h3>
              <button
                type="button"
                onClick={closeDeleteChannelModal}
                disabled={isDeletingChannel}
                aria-label="Close delete channel"
              >
                ×
              </button>
            </header>
            <div className={styles.workspaceChatDeleteBody}>
              <p>All messages in this channel will be permanently deleted.</p>
              <p>This action cannot be undone.</p>
              {deleteChannelError && (
                <small className={styles.workspaceChatModalError}>
                  {deleteChannelError}
                </small>
              )}
            </div>
            <footer className={styles.workspaceChatModalFooter}>
              <button
                type="button"
                onClick={closeDeleteChannelModal}
                disabled={isDeletingChannel}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.workspaceChatDangerButton}
                onClick={() => void deleteChannel()}
                disabled={isDeletingChannel}
              >
                {isDeletingChannel ? "Deleting..." : "Delete channel"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

type PreferenceSwitchProps = {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function PreferenceSwitch({
  label,
  helper,
  checked,
  onChange,
}: PreferenceSwitchProps) {
  return (
    <button
      type="button"
      className={styles.workspaceChatPreferenceRow}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={label}
    >
      <span>
        <b>{label}</b>
        {helper && <small>{helper}</small>}
      </span>
      <span
        className={`${styles.workspaceChatSwitch} ${
          checked ? styles.workspaceChatSwitchOn : ""
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <i />
      </span>
    </button>
  );
}

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getHistoryFilterLabel(filter: HistoryContentType): string {
  if (filter === "files") return "Files";
  if (filter === "links") return "Links";
  return "Images";
}

function extractMessageUrls(messages: ChatMessage[]): MessageUrlResult[] {
  const results: MessageUrlResult[] = [];
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  for (const message of messages) {
    const matches = message.content.match(urlPattern) ?? [];
    for (const match of matches) {
      const url = match.replace(/[),.;!?]+$/, "");
      try {
        const parsed = new URL(url);
        results.push({
          message,
          url: parsed.toString(),
          hostname: parsed.hostname,
        });
      } catch {
        // Ignore malformed URL-like text from user messages.
      }
    }
  }
  return results;
}

function filterUrlResults(
  results: MessageUrlResult[],
  query: string,
): MessageUrlResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return results;
  return results.filter((result) => {
    const haystack = [
      result.url,
      result.hostname,
      result.message.content,
      result.message.author.name,
      result.message.author.email,
      getUrlFileName(result.url),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function extractMessageAttachments(
  messages: ChatMessage[],
): MessageAttachmentResult[] {
  return messages.flatMap((message) =>
    (message.attachments ?? []).map((attachment) => ({
      message,
      attachment,
    })),
  );
}

function filterAttachmentResults(
  results: MessageAttachmentResult[],
  query: string,
): MessageAttachmentResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return results;
  return results.filter((result) => {
    const haystack = [
      result.attachment.originalName,
      result.attachment.mimeType,
      result.message.content,
      result.message.author.name,
      result.message.author.email,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = sizeBytes / 1024;
  for (const unit of units) {
    if (size < 1024 || unit === "GB") {
      return `${size.toFixed(size < 10 ? 1 : 0)} ${unit}`;
    }
    size /= 1024;
  }
  return `${sizeBytes} B`;
}

function isFileUrl(url: string): boolean {
  return hasUrlExtension(url, [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
    ".zip",
  ]);
}

function isImageUrl(url: string): boolean {
  return hasUrlExtension(url, [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
  ]);
}

function hasUrlExtension(url: string, extensions: string[]): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return extensions.some((extension) => pathname.endsWith(extension));
  } catch {
    return false;
  }
}

function getUrlFileName(url: string): string {
  try {
    const parsed = new URL(url);
    const name = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    return name || parsed.hostname;
  } catch {
    return url;
  }
}

function getDirectStorageId(userId: string): string {
  return `direct:${userId}`;
}

function getSelectionStorageId(selection: Selection): string {
  if (selection.kind === "direct") return getDirectStorageId(selection.userId);
  return selection.channelId;
}

function selectionsMatch(first: Selection, second: Selection): boolean {
  if (first.kind === "direct" && second.kind === "direct") {
    return first.userId === second.userId;
  }
  if (first.kind === "channel" && second.kind === "channel") {
    return first.channelId === second.channelId;
  }
  return false;
}

function getPreferenceKey(
  workspaceId: string,
  userId: string,
  channelId: string,
  preference: ChatPreference,
): string {
  return `workspaceChat:${workspaceId}:${userId}:${channelId}:${preference}`;
}

function readPreference(
  workspaceId: string,
  userId: string,
  channelId: string,
  preference: ChatPreference,
  defaultValue: boolean,
): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = window.localStorage.getItem(
      getPreferenceKey(workspaceId, userId, channelId, preference),
    );
    if (stored === null) return defaultValue;
    return stored === "true";
  } catch {
    return defaultValue;
  }
}

function writePreference(
  workspaceId: string,
  userId: string,
  channelId: string,
  preference: ChatPreference,
  value: boolean,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getPreferenceKey(workspaceId, userId, channelId, preference),
      String(value),
    );
  } catch (caught) {
    console.warn("Unable to save workspace chat preference.", caught);
  }
}
