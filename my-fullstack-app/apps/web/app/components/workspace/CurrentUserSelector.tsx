"use client";

import { useState } from "react";
import type { WorkspaceMember, WorkspaceRole } from "@repo/shared";
import { ApiError, type CurrentUser, workspaceApi } from "../../../lib/api-client";
import styles from "../../page.module.css";
import Icon from "../Icon";

type CurrentUserSelectorProps = {
  workspaceId?: string;
  currentUser: CurrentUser | null;
  currentRole?: WorkspaceRole;
  onOpenMembers: () => void;
};

export default function CurrentUserSelector({ workspaceId, currentUser, currentRole, onOpenMembers }: CurrentUserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = currentUser?.name ?? "Renbo";

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || !workspaceId || members.length > 0) return;
    setLoading(true); setError(null);
    try { setMembers(await workspaceApi.members(workspaceId)); }
    catch (caught: unknown) { setError(caught instanceof ApiError ? caught.message : "Unable to load members."); }
    finally { setLoading(false); }
  }

  return <div className={styles.currentUserSelector}>
    <button className={styles.userSwitch} onClick={() => void toggle()} aria-expanded={open}>
      <span className={styles.userLabel}><Icon name="user" size={13} /> CURRENT USER</span>
      <span className={styles.userRow}><i>{name.charAt(0).toUpperCase()}</i><span><b>{name}</b><small>{currentRole ?? "Owner"} Role</small></span><Icon name="chevron" size={15} /></span>
    </button>
    {open && <div className={styles.currentUserMenu}>
      {loading && <p>Loading members...</p>}
      {!loading && members.map((member) => <button key={member.id} className={member.userId === currentUser?.id ? styles.selectedCurrentUser : ""} onClick={() => { setOpen(false); onOpenMembers(); }}><i>{member.user.name.charAt(0).toUpperCase()}</i><span><b>{member.user.name}</b><small>{member.role}</small></span>{member.userId === currentUser?.id && <Icon name="check" size={14} />}</button>)}
      {!loading && members.length === 0 && <button className={styles.selectedCurrentUser} onClick={() => { setOpen(false); onOpenMembers(); }}><i>{name.charAt(0).toUpperCase()}</i><span><b>{name}</b><small>{currentRole ?? "Owner"}</small></span><Icon name="check" size={14} /></button>}
      {error && <p className={styles.currentUserMenuError}>{error}</p>}
      <button className={styles.openDirectoryItem} onClick={() => { setOpen(false); onOpenMembers(); }}><Icon name="users" size={15} />Open Members Directory</button>
    </div>}
  </div>;
}
