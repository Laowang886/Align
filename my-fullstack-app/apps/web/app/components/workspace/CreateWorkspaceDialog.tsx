"use client";

import { useState, type FormEvent } from "react";
import type { CreateWorkspaceInput } from "@repo/shared";
import styles from "../../page.module.css";
import Icon from "../Icon";

type CreateWorkspaceDialogProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateWorkspaceInput) => Promise<void>;
};

export default function CreateWorkspaceDialog({ open, loading, error, onClose, onSubmit }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, ...(slug.trim() ? { slug } : {}), ...(description.trim() ? { description } : {}) });
  }

  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <section className={styles.workspaceDialog} role="dialog" aria-modal="true" aria-labelledby="create-workspace-title">
      <div className={styles.dialogHeading}><div className={styles.dialogIcon}><Icon name="plus" /></div><div><h2 id="create-workspace-title">Create Workspace</h2><p>Set up a space for your team and projects.</p></div><button onClick={onClose} disabled={loading} aria-label="Close">×</button></div>
      <form onSubmit={submit}>
        <label>Workspace name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required placeholder="e.g. Product Engineering" /></label>
        <label>Custom slug <span>optional</span><input value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={100} placeholder="product-engineering" /><small>Leave blank to generate it from the name.</small></label>
        <label>Description <span>optional</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="What does this team work on?" /></label>
        {error && <div className={styles.formError}><Icon name="alert" size={16} />{error}</div>}
        <div className={styles.dialogActions}><button type="button" onClick={onClose} disabled={loading}>Cancel</button><button type="submit" disabled={loading || name.trim().length < 2}>{loading ? "Creating..." : "Create Workspace"}</button></div>
      </form>
    </section>
  </div>;
}
