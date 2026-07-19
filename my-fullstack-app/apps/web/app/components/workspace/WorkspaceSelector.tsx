"use client";

import { useState } from "react";
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
};

export default function WorkspaceSelector({ workspaces, currentWorkspace, onSelect, onCreate }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);

  return <div className={styles.workspaceSelector}>
    <button className={styles.switcher} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span><small>WORKSPACE</small><b>{currentWorkspace?.name ?? "Select workspace"}</b></span>
      <Icon name="chevron" size={15} />
    </button>
    {open && <div className={styles.workspaceMenu}>
      {workspaces.map((workspace) => <button key={workspace.id} className={workspace.id === currentWorkspace?.id ? styles.selectedWorkspace : ""} onClick={() => { setOpen(false); onSelect(workspace.id); }}>
        {workspace.avatarUrl ? <img className={styles.workspaceMenuAvatar} src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${workspace.avatarUrl}`} alt="" /> : <i className={styles.workspaceMenuAvatar}><Icon name={presetIcons[workspace.avatarPreset ?? ""] ?? "board"} size={13} /></i>}<span>{workspace.name}</span>{workspace.id === currentWorkspace?.id && <i className={styles.workspaceSelectedDot} />}
      </button>)}
      <button className={styles.createWorkspaceMenuItem} onClick={() => { setOpen(false); onCreate(); }}><Icon name="plus" size={16} />Create Workspace</button>
    </div>}
  </div>;
}
