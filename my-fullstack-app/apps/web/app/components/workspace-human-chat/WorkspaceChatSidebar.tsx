"use client";

import type { WorkspaceMember } from "@repo/shared";
import styles from "../../page.module.css";
import Icon from "../Icon";
import type {
  ChatTarget,
  HumanChatChannel,
  HumanChatDirectConversation,
} from "./types";

type WorkspaceChatSidebarProps = {
  workspaceName: string;
  channels: HumanChatChannel[];
  members: WorkspaceMember[];
  directConversations: HumanChatDirectConversation[];
  currentUserId?: string;
  activeTarget: ChatTarget | null;
  search: string;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onSelectChannel: (channel: HumanChatChannel) => void;
  onSelectMember: (member: WorkspaceMember) => void;
  onAddChannel: () => void;
  onInvitePeople: () => void;
};

export default function WorkspaceChatSidebar({
  workspaceName,
  channels,
  members,
  directConversations,
  currentUserId,
  activeTarget,
  search,
  loading,
  onSearchChange,
  onSelectChannel,
  onSelectMember,
  onAddChannel,
  onInvitePeople,
}: WorkspaceChatSidebarProps) {
  const normalizedSearch = search.trim().toLowerCase();
  const visibleChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(normalizedSearch),
  );
  const visibleMembers = members.filter(
    (member) =>
      member.user.id !== currentUserId &&
      (member.user.name.toLowerCase().includes(normalizedSearch) ||
        member.user.email.toLowerCase().includes(normalizedSearch)),
  );

  return (
    <aside className={styles.humanChatSidebar}>
      <div className={styles.humanChatWorkspace}>
        <b>{workspaceName}</b>
        <span>{loading ? "Syncing chat" : "Workspace conversations"}</span>
      </div>
      <label className={styles.humanChatSearch}>
        <Icon name="chat" size={14} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search chat"
        />
      </label>
      <div className={styles.humanChatNavSection}>
        <div className={styles.humanChatSectionHead}>
          <span>Channels</span>
          <button type="button" onClick={onAddChannel} title="Add channel">
            <Icon name="plus" size={14} />
          </button>
        </div>
        <div className={styles.humanChatNavList}>
          {visibleChannels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              className={
                activeTarget?.type === "channel" &&
                activeTarget.channel.id === channel.id
                  ? styles.humanChatNavActive
                  : undefined
              }
              onClick={() => onSelectChannel(channel)}
            >
              <span>#</span>
              <b>{channel.name}</b>
            </button>
          ))}
          {visibleChannels.length === 0 && (
            <p className={styles.humanChatSidebarEmpty}>No channels found.</p>
          )}
          <button
            type="button"
            className={styles.humanChatAddTextButton}
            onClick={onAddChannel}
          >
            <Icon name="plus" size={14} />
            Add channel
          </button>
        </div>
      </div>
      <div className={styles.humanChatNavSection}>
        <div className={styles.humanChatSectionHead}>
          <span>Direct messages</span>
        </div>
        <div className={styles.humanChatNavList}>
          {visibleMembers.map((member) => {
            const conversation = directConversations.find(
              (item) => item.otherUser.id === member.user.id,
            );
            const active =
              activeTarget?.type === "dm" &&
              (activeTarget.conversation.id === conversation?.id ||
                activeTarget.conversation.otherUser.id === member.user.id);

            return (
              <button
                key={member.id}
                type="button"
                className={active ? styles.humanChatNavActive : undefined}
                onClick={() => onSelectMember(member)}
              >
                <i>{getInitial(member.user.name)}</i>
                <b>{member.user.name}</b>
              </button>
            );
          })}
          {visibleMembers.length === 0 && (
            <p className={styles.humanChatSidebarEmpty}>No members found.</p>
          )}
          <button
            type="button"
            className={styles.humanChatAddTextButton}
            onClick={onInvitePeople}
          >
            <Icon name="users" size={14} />
            Invite people
          </button>
        </div>
      </div>
    </aside>
  );
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
