"use client";

import { useEffect, useRef, useState } from "react";
import type { WikiDocument } from "@repo/shared";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApiError, wikiApi } from "../../../lib/api-client";
import styles from "../../page.module.css";
import Icon from "../Icon";
import type { WorkspaceProject } from "./project-planning-types";

type SaveStatus = "saved" | "saving" | "error";

type Props = {
  workspaceId: string;
  project: WorkspaceProject | null;
  onOpenProjects: () => void;
  onNotify: (message: string) => void;
};

const NEW_DOCUMENT_CONTENT =
  "# New Page Title\n\nWrite documentation using standard **Markdown** formatting.";

export default function WikiDocumentsView({
  workspaceId,
  project,
  onOpenProjects,
  onNotify,
}: Props) {
  const [documents, setDocuments] = useState<WikiDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [mobilePanel, setMobilePanel] = useState<"editor" | "preview">(
    "editor",
  );
  const saveVersion = useRef(0);

  const selectedDocument =
    documents.find((document) => document.id === selectedId) ?? null;
  const isDirty = Boolean(
    selectedDocument &&
    (selectedDocument.title !== editTitle ||
      selectedDocument.content !== editContent),
  );

  useEffect(() => {
    if (!project) {
      setDocuments([]);
      setSelectedId(null);
      setEditing(false);
      return;
    }
    let active = true;
    saveVersion.current += 1;
    setLoading(true);
    setLoadError(null);
    setEditing(false);
    void wikiApi
      .list(workspaceId, project.id)
      .then((items) => {
        if (!active) return;
        setDocuments(items);
        const first = items[0] ?? null;
        setSelectedId(first?.id ?? null);
        setEditTitle(first?.title ?? "");
        setEditContent(first?.content ?? "");
        setSaveStatus("saved");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setDocuments([]);
        setSelectedId(null);
        setLoadError(errorMessage(caught, "Unable to load wiki documents."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [project, workspaceId]);

  useEffect(() => {
    if (!editing || !project || !selectedDocument || !isDirty) {
      if (editing && !isDirty) setSaveStatus("saved");
      return;
    }
    const version = ++saveVersion.current;
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      void persistDocument(version);
    }, 1500);
    return () => window.clearTimeout(timeout);
    // selectedDocument is intentionally represented by its stable id and draft comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editContent, editTitle, editing, project?.id, selectedId]);

  async function persistDocument(version = ++saveVersion.current) {
    if (!project || !selectedDocument) return false;
    setSaveStatus("saving");
    try {
      const updated = await wikiApi.update(
        workspaceId,
        project.id,
        selectedDocument.id,
        { title: editTitle, content: editContent },
      );
      setDocuments((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      if (saveVersion.current === version) setSaveStatus("saved");
      return true;
    } catch (caught: unknown) {
      if (saveVersion.current === version) setSaveStatus("error");
      onNotify(errorMessage(caught, "Unable to save this wiki page."));
      return false;
    }
  }

  async function selectDocument(document: WikiDocument) {
    if (document.id === selectedId) return;
    if (editing && isDirty) {
      const saved = await persistDocument();
      if (!saved) return;
    }
    saveVersion.current += 1;
    setSelectedId(document.id);
    setEditTitle(document.title);
    setEditContent(document.content);
    setEditing(false);
    setSaveStatus("saved");
  }

  async function createDocument() {
    if (!project || creating) return;
    setCreating(true);
    try {
      const created = await wikiApi.create(workspaceId, project.id, {
        title: `Untitled Page ${documents.length + 1}`,
        content: NEW_DOCUMENT_CONTENT,
      });
      setDocuments((items) => [created, ...items]);
      setSelectedId(created.id);
      setEditTitle(created.title);
      setEditContent(created.content);
      setEditing(true);
      setSaveStatus("saved");
      setMobilePanel("editor");
    } catch (caught: unknown) {
      onNotify(errorMessage(caught, "Unable to create a wiki page."));
    } finally {
      setCreating(false);
    }
  }

  async function finishEditing() {
    if (isDirty) {
      const saved = await persistDocument();
      if (!saved) return;
    }
    setEditing(false);
  }

  if (!project) {
    return (
      <main className={styles.wikiState}>
        <span className={styles.wikiStateIcon}>
          <Icon name="book" size={30} />
        </span>
        <h2>Select or create a project</h2>
        <p>Wiki pages are organized inside projects.</p>
        <button onClick={onOpenProjects}>
          <Icon name="plus" size={16} /> Create Project
        </button>
      </main>
    );
  }

  return (
    <main className={styles.wikiView}>
      <aside className={styles.wikiPages}>
        <div className={styles.wikiPagesHeading}>
          <span>WIKI PAGES ({documents.length})</span>
          <button
            onClick={() => void createDocument()}
            disabled={creating}
            aria-label="Create wiki page"
            title="Create wiki page"
          >
            <Icon name="plus" size={17} />
          </button>
        </div>
        <div className={styles.wikiPageList}>
          {documents.map((document) => (
            <button
              key={document.id}
              className={
                document.id === selectedId ? styles.activeWikiPage : ""
              }
              onClick={() => void selectDocument(document)}
            >
              <Icon name="file" size={17} />
              <span>{document.title}</span>
            </button>
          ))}
          {!loading && documents.length === 0 && !loadError && (
            <p>No pages yet. Use + to create the first page.</p>
          )}
          {loading && <p>Loading wiki pages...</p>}
          {loadError && (
            <div className={styles.wikiListError}>
              <p>{loadError}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}
        </div>
      </aside>

      <section className={styles.wikiDocument}>
        {selectedDocument ? (
          <>
            <header className={styles.wikiDocumentHeader}>
              <div className={styles.wikiDocumentMeta}>
                <Icon name="file" size={19} />
                <span>
                  <b>{selectedDocument.title}</b>
                  <small>
                    Last modified: {formatDate(selectedDocument.updatedAt)}
                  </small>
                </span>
                {editing && (
                  <em className={styles[`wikiSave_${saveStatus}`]}>
                    <Icon
                      name={saveStatus === "error" ? "alert" : "check"}
                      size={14}
                    />
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "error"
                        ? "Save failed"
                        : "Autosaved"}
                  </em>
                )}
              </div>
              <div className={styles.wikiActions}>
                <button
                  className={!editing ? styles.activeWikiAction : ""}
                  onClick={() => void finishEditing()}
                >
                  <Icon name="eye" size={16} /> Read
                </button>
                <button
                  className={editing ? styles.activeWikiAction : ""}
                  onClick={() => setEditing(true)}
                >
                  <Icon name="edit" size={16} /> Edit Page
                </button>
                {editing && (
                  <button
                    className={styles.finishWikiEditing}
                    onClick={() => void finishEditing()}
                  >
                    <Icon name="save" size={16} /> Finish Editing
                  </button>
                )}
              </div>
            </header>

            {editing ? (
              <div className={styles.wikiEditorWrap}>
                <div className={styles.wikiMobileTabs}>
                  <button
                    className={
                      mobilePanel === "editor" ? styles.activeWikiTab : ""
                    }
                    onClick={() => setMobilePanel("editor")}
                  >
                    Editor
                  </button>
                  <button
                    className={
                      mobilePanel === "preview" ? styles.activeWikiTab : ""
                    }
                    onClick={() => setMobilePanel("preview")}
                  >
                    Preview
                  </button>
                </div>
                <div
                  className={`${styles.wikiEditor} ${
                    mobilePanel === "preview" ? styles.wikiMobileHidden : ""
                  }`}
                >
                  <input
                    value={editTitle}
                    maxLength={160}
                    aria-label="Wiki page title"
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Page title"
                  />
                  <textarea
                    value={editContent}
                    maxLength={200 * 1024}
                    aria-label="Wiki page Markdown content"
                    onChange={(event) => setEditContent(event.target.value)}
                    placeholder="Write Markdown here..."
                  />
                </div>
                <div
                  className={`${styles.wikiPreview} ${
                    mobilePanel === "editor" ? styles.wikiMobileHidden : ""
                  }`}
                >
                  <div className={styles.wikiPreviewHeading}>
                    LIVE PREVIEW COMPILED
                  </div>
                  <article className="markdown-body">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {editContent}
                    </Markdown>
                  </article>
                </div>
              </div>
            ) : (
              <div className={styles.wikiReader}>
                <article>
                  <h1>{selectedDocument.title}</h1>
                  <div className="markdown-body">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {selectedDocument.content}
                    </Markdown>
                  </div>
                </article>
              </div>
            )}
          </>
        ) : (
          !loading &&
          !loadError && (
            <div className={styles.wikiEmptyDocument}>
              <Icon name="book" size={38} />
              <h2>Create your first wiki page</h2>
              <p>Capture architecture notes, runbooks, and team knowledge.</p>
              <button onClick={() => void createDocument()} disabled={creating}>
                <Icon name="plus" size={16} />
                {creating ? "Creating..." : "Add Wiki Page"}
              </button>
            </div>
          )
        )}
      </section>
    </main>
  );
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof ApiError || caught instanceof Error
    ? caught.message
    : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
