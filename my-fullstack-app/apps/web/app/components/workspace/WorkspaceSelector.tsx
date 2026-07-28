"use client";

import { useEffect, useState } from "react";
import type { WorkspaceSummary } from "@repo/shared";
import styles from "../../page.module.css";
import Icon from "../Icon";
import type { IconName } from "../types";

const presetIcons: Record<string, IconName> = { board: "board", users: "users", clipboard: "clipboard", chat: "chat" };

type WorkspaceSelectorProps = {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  onSelect: (workspaceId: string) => void;
  onCreate: () => void;
  onDelete: (workspace: WorkspaceSummary) => void;
};

export default function WorkspaceSelector({ workspaces, currentWorkspace, onSelect, onCreate, onDelete }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.sessionStorage.getItem("workspace-selector-open") === "true");
  }, []);

  function toggleMenu() {
    setOpen((value) => {
      const nextValue = !value;
      window.sessionStorage.setItem("workspace-selector-open", String(nextValue));
      return nextValue;
    });
  }

  return <div className={styles.workspaceSelector}>
    <button className={styles.switcher} onClick={toggleMenu} aria-expanded={open}>
      <span><small>WORKSPACE</small><b>{currentWorkspace?.name ?? "Select workspace"}</b></span>
      <Icon name="chevron" size={15} />
    </button>
    {open && <div className={styles.workspaceMenu}>
      {workspaces.map((workspace) => <button key={workspace.id} className={workspace.id === currentWorkspace?.id ? styles.selectedWorkspace : ""} onClick={() => onSelect(workspace.id)}>
        {workspace.avatarUrl ? <img className={styles.workspaceMenuAvatar} src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${workspace.avatarUrl}`} alt="" /> : <i className={styles.workspaceMenuAvatar}><Icon name={presetIcons[workspace.avatarPreset ?? ""] ?? "board"} size={13} /></i>}<span>{workspace.name}</span>{workspace.id === currentWorkspace?.id && workspace.currentUserRole === "OWNER" && <i className={styles.workspaceSelectedDot} title="Delete workspace" onClick={(event) => { event.stopPropagation(); onDelete(workspace); }}><Icon name="trash" size={15} /></i>}
      </button>)}
      <button className={styles.createWorkspaceMenuItem} onClick={onCreate}><Icon name="plus" size={16} />Create Workspace</button>
    </div>}
  </div>;
}
