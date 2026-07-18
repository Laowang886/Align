"use client";

import { useEffect, useRef } from "react";
import styles from "../../page.module.css";
import Icon from "../Icon";
import type { ChatTarget, HumanChatMessage } from "./types";

type ChatMessageListProps = {
  target: ChatTarget | null;
  messages: HumanChatMessage[];
  loading: boolean;
  error: string | null;
  currentUserId?: string;
  onRetry: () => void;
};

export default function ChatMessageList({
  target,
  messages,
  loading,
  error,
  currentUserId,
  onRetry,
}: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, target?.id]);

  if (!target) {
    return (
      <div className={styles.humanChatState}>
        <Icon name="chat" size={30} />
        <h2>Select a conversation</h2>
        <p>Choose a channel or teammate to open saved workspace messages.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.humanChatState}>
        <div className={styles.loadingSpinner} />
        <h2>Loading messages</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.humanChatState}>
        <Icon name="alert" size={30} />
        <h2>Messages unavailable</h2>
        <p>{error}</p>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={styles.humanChatState}>
        <Icon name="chat" size={30} />
        <h2>No messages yet</h2>
        <p>Start the conversation. Messages are saved to this workspace.</p>
      </div>
    );
  }

  return (
    <div className={styles.humanChatMessages}>
      {messages.map((message) => {
        const mine = message.authorId === currentUserId;
        return (
          <article
            key={message.id}
            className={`${styles.humanChatMessage} ${
              mine ? styles.humanChatMessageMine : ""
            }`}
          >
            <i>{getInitial(message.author.name)}</i>
            <div>
              <header>
                <b>{message.author.name}</b>
                <time dateTime={message.createdAt}>
                  {formatMessageTime(message.createdAt)}
                </time>
              </header>
              <p>{message.content}</p>
            </div>
          </article>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
