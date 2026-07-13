"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkspaceDetails, WorkspaceMember } from "@repo/shared";
import { ApiError, type CurrentUser, workspaceApi } from "../../../lib/api-client";
import styles from "../../page.module.css";
import Icon from "../Icon";

type MembersAccessDialogProps = {
  open: boolean;
  workspace: WorkspaceDetails;
  currentUser: CurrentUser;
  onClose: () => void;
  onWorkspaceChanged: () => Promise<void>;
  onLeft: () => void;
};

export default function MembersAccessDialog({ open, workspace, currentUser, onClose, onWorkspaceChanged, onLeft }: MembersAccessDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setMembers(await workspaceApi.members(workspace.id)); }
    catch (caught: unknown) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }, [workspace.id]);

  useEffect(() => { if (open) void loadMembers(); }, [loadMembers, open]);
  if (!open) return null;

  async function updateRole(member: WorkspaceMember, role: "ADMIN" | "MEMBER") {
    setPendingId(member.id); setError(null);
    try { await workspaceApi.updateMemberRole(workspace.id, member.id, role); await loadMembers(); }
    catch (caught: unknown) { setError(errorMessage(caught)); }
    finally { setPendingId(null); }
  }

  async function remove(member: WorkspaceMember) {
    if (!window.confirm(`Remove ${member.user.name} from this workspace?`)) return;
    setPendingId(member.id); setError(null);
    try { await workspaceApi.removeMember(workspace.id, member.id); await loadMembers(); await onWorkspaceChanged(); }
    catch (caught: unknown) { setError(errorMessage(caught)); }
    finally { setPendingId(null); }
  }

  async function transfer(member: WorkspaceMember) {
    if (!window.confirm(`Transfer workspace ownership to ${member.user.name}?`)) return;
    setPendingId(member.id); setError(null);
    try { await workspaceApi.transferOwnership(workspace.id, member.id); await loadMembers(); await onWorkspaceChanged(); }
    catch (caught: unknown) { setError(errorMessage(caught)); }
    finally { setPendingId(null); }
  }

  async function leave() {
    if (!window.confirm(workspace.currentUserRole === "OWNER" && members.length === 1 ? "Leaving will delete this empty workspace. Continue?" : "Leave this workspace?")) return;
    setPendingId(currentUser.id); setError(null);
    try { await workspaceApi.leave(workspace.id); onLeft(); }
    catch (caught: unknown) { setError(errorMessage(caught)); setPendingId(null); }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true); setError(null);
    try {
      await workspaceApi.inviteMember(workspace.id, { email: inviteEmail, role: inviteRole });
      setInviteEmail(""); setInviteRole("MEMBER");
      await loadMembers(); await onWorkspaceChanged();
    } catch (caught: unknown) { setError(errorMessage(caught)); }
    finally { setInviting(false); }
  }

  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pendingId) onClose(); }}>
    <section className={styles.membersDialog} role="dialog" aria-modal="true" aria-labelledby="members-title">
      <div className={styles.membersDialogHeading}><div><h2 id="members-title">Team Members Directory</h2><p>Manage access controls and roles for members of this Workspace.</p></div><button onClick={onClose}>Close</button></div>
      {loading ? <div className={styles.membersLoading}><div className={styles.loadingSpinner} />Loading members...</div> : <div className={styles.membersList}>{members.map((member) => {
        const isSelf = member.userId === currentUser.id;
        const canChange = workspace.currentUserRole === "OWNER" && member.role !== "OWNER";
        const canRemove = !isSelf && member.role !== "OWNER" && (workspace.currentUserRole === "OWNER" || (workspace.currentUserRole === "ADMIN" && member.role === "MEMBER"));
        const canTransfer = workspace.currentUserRole === "OWNER" && member.role !== "OWNER";
        return <article key={member.id} className={styles.memberRow}><i>{member.user.name.charAt(0).toUpperCase()}</i><div><b>{member.user.name}{isSelf ? " (You)" : ""}</b><span>{member.user.email}</span></div>{canChange ? <select aria-label={`Role for ${member.user.name}`} disabled={pendingId === member.id} value={member.role} onChange={(event) => void updateRole(member, event.target.value as "ADMIN" | "MEMBER")}><option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select> : <strong>{member.role}</strong>}<div className={styles.memberActions}>{canTransfer && <button onClick={() => void transfer(member)} disabled={pendingId === member.id} title="Transfer ownership"><Icon name="trend" size={14} /></button>}{canRemove && <button onClick={() => void remove(member)} disabled={pendingId === member.id} title="Remove member">×</button>}</div></article>;
      })}</div>}
      {(workspace.currentUserRole === "OWNER" || workspace.currentUserRole === "ADMIN") && <form className={styles.memberInvite} onSubmit={invite}>
        <div className={styles.memberInviteTitle}><Icon name="mail" size={15} /><b>Invite New Team Member</b></div>
        <div className={styles.memberInviteFields}>
          <label><span>MEMBER EMAIL</span><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="e.g. coauthor@gmail.com" required disabled={inviting} /></label>
          <label><span>WORKSPACE ROLE</span><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "ADMIN" | "MEMBER")} disabled={inviting}><option value="MEMBER">Member</option>{workspace.currentUserRole === "OWNER" && <option value="ADMIN">Admin</option>}</select></label>
        </div>
        <button type="submit" disabled={inviting || !inviteEmail.trim()}>{inviting ? "Sending..." : "Send Invitation"}</button>
      </form>}
      {error && <div className={styles.membersError}><Icon name="alert" size={15} />{error}</div>}
      <div className={styles.membersFooter}><p>{workspace.currentUserRole === "OWNER" && members.length > 1 ? "Transfer ownership before leaving this workspace." : "You can leave this workspace at any time."}</p><button onClick={() => void leave()} disabled={Boolean(pendingId)}>{workspace.currentUserRole === "OWNER" && members.length === 1 ? "Delete & Leave" : "Leave Workspace"}</button></div>
    </section>
  </div>;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Unable to update workspace members.";
}
