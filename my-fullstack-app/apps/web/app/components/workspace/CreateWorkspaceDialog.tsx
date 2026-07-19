"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CreateWorkspaceInput } from "@repo/shared";
import { ApiError, userApi } from "../../../lib/api-client";
import styles from "../../page.module.css";
import Icon from "../Icon";
import type { IconName } from "../types";

const presets: { id: string; icon: IconName; label: string }[] = [
  { id: "board", icon: "board", label: "Board" },
  { id: "users", icon: "users", label: "People" },
  { id: "clipboard", icon: "clipboard", label: "Planning" },
  { id: "chat", icon: "chat", label: "Chat" },
];

type CreateWorkspaceDialogProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateWorkspaceInput) => Promise<void>;
};

export default function CreateWorkspaceDialog({
  open,
  loading,
  error,
  onClose,
  onSubmit,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [avatarPreset, setAvatarPreset] = useState("board");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setName("");
    setSlug("");
    setDescription("");
    setAvatarPreset("board");
    setAvatarUrl(null);
    setUploadError(null);
  }, [open]);

  if (!open) return null;

  async function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setUploadError("Choose a JPEG, PNG, WEBP, or GIF image up to 2 MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await userApi.uploadWorkspaceImage(file);
      setAvatarUrl(uploaded.url);
      setAvatarPreset("");
    } catch (caught: unknown) {
      setUploadError(caught instanceof ApiError ? caught.message : "Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name,
      ...(slug.trim() ? { slug } : {}),
      ...(description.trim() ? { description } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(!avatarUrl && avatarPreset ? { avatarPreset } : {}),
    });
  }

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <section
        className={styles.workspaceDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-workspace-title"
      >
        <div className={styles.dialogHeading}>
          <button
            type="button"
            className={styles.dialogIcon}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Upload workspace image"
          >
            {avatarUrl ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${avatarUrl}`}
                alt=""
              />
            ) : uploading ? (
              "…"
            ) : (
              <Icon name="plus" />
            )}
          </button>
          <div>
            <h2 id="create-workspace-title">Create Workspace</h2>
            <p>Set up a space for your team and projects.</p>
          </div>
          <button
            className={styles.dialogCloseButton}
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <fieldset className={styles.workspaceAvatarField}>
            <legend>Workspace image</legend>
            <div className={styles.workspaceAvatarChoices}>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={!avatarUrl && avatarPreset === preset.id ? styles.workspaceAvatarSelected : ""}
                  aria-label={`Use ${preset.label} workspace image`}
                  aria-pressed={!avatarUrl && avatarPreset === preset.id}
                  onClick={() => {
                    setAvatarPreset(preset.id);
                    setAvatarUrl(null);
                  }}
                >
                  <Icon name={preset.icon} size={18} />
                </button>
              ))}
            </div>
            <input
              ref={fileInputRef}
              className={styles.workspaceAvatarInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => void selectImage(event)}
            />
          </fieldset>

          <label>
            Workspace name
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
              placeholder="e.g. Product Engineering"
            />
          </label>

          <label>
            Custom slug <span>optional</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={100}
              placeholder="product-engineering"
            />
            <small>Leave blank to generate it from the name.</small>
          </label>

          <label>
            Description <span>optional</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What does this team work on?"
            />
          </label>

          {uploadError && (
            <div className={styles.formError}>
              <Icon name="alert" size={16} />
              {uploadError}
            </div>
          )}

          {error && (
            <div className={styles.formError}>
              <Icon name="alert" size={16} />
              {error}
            </div>
          )}

          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || uploading || name.trim().length < 2}>
              {loading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
