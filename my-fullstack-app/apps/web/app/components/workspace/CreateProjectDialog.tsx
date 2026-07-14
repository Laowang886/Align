"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../../page.module.css";
import type { ProjectTheme, WorkspaceProject } from "./project-planning-types";

const colors = [
  "#6366f1",
  "#10b981",
  "#e11d48",
  "#f59e0b",
  "#a855f7",
  "#0ea5e9",
] as const satisfies readonly ProjectTheme[];

type Props = {
  open: boolean;
  workspaceId: string;
  existingKeys: string[];
  onClose: () => void;
  onCreate: (project: WorkspaceProject) => void;
};

export default function CreateProjectDialog({
  open,
  workspaceId,
  existingKeys,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<ProjectTheme>(colors[0]);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  function resetAndClose() {
    setName("");
    setKey("");
    setDescription("");
    setColor(colors[0]);
    setError("");
    onClose();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedKey = key.trim().toUpperCase();
    if (!normalizedName || !normalizedKey)
      return setError("Project name and key are required.");
    if (!/^[A-Z][A-Z0-9]{0,5}$/.test(normalizedKey))
      return setError(
        "Key must be 1–6 letters or numbers and start with a letter.",
      );
    if (existingKeys.includes(normalizedKey))
      return setError("This project key is already in use.");
    onCreate({
      id: crypto.randomUUID(),
      workspaceId,
      name: normalizedName,
      key: normalizedKey,
      description: description.trim(),
      color,
    });
    resetAndClose();
  }

  return (
    <div
      className={styles.projectModalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) resetAndClose();
      }}
    >
      <section
        className={styles.projectModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        <h2 id="create-project-title">Create New Project</h2>
        <p>
          Each project contains its own backlog, Kanban board, story keys, and
          documentation.
        </p>
        <form onSubmit={submit}>
          <div className={styles.projectFormGrid}>
            <label>
              <span>PROJECT NAME</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="e.g. Website Overhaul"
              />
            </label>
            <label>
              <span>KEY IDENTIFIER</span>
              <input
                className={styles.projectKeyInput}
                value={key}
                maxLength={6}
                onChange={(event) => {
                  setKey(
                    event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  );
                  setError("");
                }}
                placeholder="E.G. WEB"
              />
            </label>
          </div>
          <label>
            <span>DESCRIPTION</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Summarize project targets..."
            />
          </label>
          <fieldset>
            <legend>THEME COLOR</legend>
            <div className={styles.projectColors}>
              {colors.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Use ${option} theme`}
                  aria-pressed={color === option}
                  className={
                    color === option ? styles.selectedProjectColor : ""
                  }
                  style={{ background: option }}
                  onClick={() => setColor(option)}
                />
              ))}
            </div>
          </fieldset>
          {error && <div className={styles.projectFormError}>{error}</div>}
          <div className={styles.projectModalActions}>
            <button type="button" onClick={resetAndClose}>
              Cancel
            </button>
            <button type="submit">Create Project</button>
          </div>
        </form>
      </section>
    </div>
  );
}
