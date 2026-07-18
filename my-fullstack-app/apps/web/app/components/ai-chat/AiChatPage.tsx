"use client";

import styles from "../../page.module.css";
import WorkspaceChatWidget from "../workspace-chat/WorkspaceChatWidget";

type AiChatPageProps = {
  workspaceId: string;
  activeProject?: {
    id: string;
    name: string;
    key: string;
  } | null;
  onCollapseToWidget: () => void;
};

export default function AiChatPage({
  workspaceId,
  activeProject,
  onCollapseToWidget,
}: AiChatPageProps) {
  return (
    <main className={styles.aiChatPage}>
      <WorkspaceChatWidget
        workspaceId={workspaceId}
        activeProject={activeProject}
        embedded
        onCollapseToWidget={onCollapseToWidget}
      />
    </main>
  );
}
