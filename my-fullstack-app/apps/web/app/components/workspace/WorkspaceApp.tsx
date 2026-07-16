"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateProjectInput,
  CreateSprintInput,
  CreateWorkspaceInput,
  Sprint,
  SprintStatus,
  WorkspaceDetails,
  WorkspaceSummary,
} from "@repo/shared";
import {
  ApiError,
  authApi,
  clearClientAuthState,
  projectApi,
  sprintApi,
  type CurrentUser,
  workspaceApi,
} from "../../../lib/api-client";
import styles from "../../page.module.css";
import CreateWorkspaceDialog from "./CreateWorkspaceDialog";
import WorkspaceSelector from "./WorkspaceSelector";
import { WorkspaceEmptyState, WorkspaceLoadingState } from "./WorkspaceStates";
import DashboardView from "../DashboardView";
import Header from "../Header";
import Icon from "../Icon";
import KanbanBoardView from "../KanbanBoardView";
import Sidebar from "../Sidebar";
import MembersAccessDialog from "./MembersAccessDialog";
import CurrentUserSelector from "./CurrentUserSelector";
import CreateProjectDialog from "./CreateProjectDialog";
import SprintsView from "../SprintsView";
import WikiDocumentsView from "./WikiDocumentsView";
import type { WorkspaceProject } from "./project-planning-types";

type ViewState = "loading" | "ready" | "empty" | "error";
type WorkspaceView =
  | "Dashboard"
  | "Kanban Board"
  | "Sprints"
  | "Wiki Documents";

export default function WorkspaceApp({
  workspaceId,
}: {
  workspaceId?: string;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<WorkspaceView>("Dashboard");
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceDetails | null>(null);
  const [error, setError] = useState<{
    message: string;
    unauthorized: boolean;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const projectLoadWorkspaceId = useRef<string | null>(null);
  const sprintLoadKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    setViewState("loading");
    setError(null);
    try {
      const [list, user] = await Promise.all([
        workspaceApi.list(),
        authApi.me(),
      ]);
      setCurrentUser(user);
      setWorkspaces(list);
      if (list.length === 0) {
        setCurrentWorkspace(null);
        setViewState("empty");
        return;
      }
      if (!workspaceId) {
        const savedId = window.localStorage.getItem("currentWorkspaceId");
        const nextWorkspace =
          list.find((workspace) => workspace.id === savedId) ?? list.at(0);
        if (!nextWorkspace) {
          setViewState("empty");
          return;
        }
        router.replace(`/workspaces/${nextWorkspace.id}`);
        return;
      }
      const details = await workspaceApi.get(workspaceId);
      setCurrentWorkspace(details);
      window.localStorage.setItem("currentWorkspaceId", details.id);
      setViewState("ready");
    } catch (caught: unknown) {
      const apiError =
        caught instanceof ApiError
          ? caught
          : new ApiError(0, "Unexpected workspace error.");
      if (apiError.status === 401) {
        clearClientAuthState();
        router.replace("/login");
        return;
      }
      setError({
        message: apiError.message,
        unauthorized: apiError.status === 401,
      });
      setViewState("error");
    }
  }, [router, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (
      !currentWorkspace ||
      viewState !== "ready" ||
      projectLoadWorkspaceId.current === currentWorkspace.id
    )
      return;
    projectLoadWorkspaceId.current = currentWorkspace.id;
    setProjects([]);
    setSprints([]);
    setActiveProjectId(null);
    void projectApi
      .list(currentWorkspace.id)
      .then((items) => {
        if (projectLoadWorkspaceId.current !== currentWorkspace.id) return;
        const loadedProjects = items as WorkspaceProject[];
        setProjects(loadedProjects);
        setActiveProjectId((selectedId) =>
          loadedProjects.some((project) => project.id === selectedId)
            ? selectedId
            : (loadedProjects[0]?.id ?? null),
        );
      })
      .catch((caught: unknown) => {
        if (projectLoadWorkspaceId.current !== currentWorkspace.id) return;
        setProjects([]);
        setActiveProjectId(null);
        showToast(
          caught instanceof ApiError
            ? caught.message
            : "Unable to load projects.",
        );
      });
  }, [currentWorkspace, viewState]);

  useEffect(() => {
    const project = projects.find((item) => item.id === activeProjectId);
    if (
      viewState !== "ready" ||
      !currentWorkspace ||
      !project ||
      project.workspaceId !== currentWorkspace.id
    ) {
      sprintLoadKey.current = null;
      setSprints([]);
      setSprintsLoading(false);
      return;
    }

    const requestKey = `${currentWorkspace.id}:${project.id}`;
    sprintLoadKey.current = requestKey;
    setSprints([]);
    setSprintsLoading(true);
    void sprintApi
      .list(currentWorkspace.id, project.id)
      .then((items) => {
        if (sprintLoadKey.current !== requestKey) return;
        setSprints(items);
      })
      .catch((caught: unknown) => {
        if (sprintLoadKey.current !== requestKey) return;
        showToast(
          caught instanceof ApiError
            ? caught.message
            : "Unable to load sprints.",
        );
      })
      .finally(() => {
        if (sprintLoadKey.current === requestKey) setSprintsLoading(false);
      });
  }, [activeProjectId, currentWorkspace, projects, viewState]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function navigate(view: string) {
    if (
      view === "Dashboard" ||
      view === "Kanban Board" ||
      view === "Sprints" ||
      view === "Wiki Documents"
    ) {
      setActiveView(view);
      return;
    }

    showToast(`${view} view is coming next.`);
  }

  function selectWorkspace(id: string) {
    if (id === currentWorkspace?.id) return;
    setViewState("loading");
    router.push(`/workspaces/${id}`);
  }

  async function createWorkspace(input: CreateWorkspaceInput) {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await workspaceApi.create(input);
      setWorkspaces((items) => [...items, created]);
      setDialogOpen(false);
      window.localStorage.setItem("currentWorkspaceId", created.id);
      showToast(`${created.name} created successfully.`);
      router.push(`/workspaces/${created.id}`);
    } catch (caught: unknown) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : "Unable to create workspace.";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  function leftWorkspace() {
    setMembersOpen(false);
    setCurrentWorkspace(null);
    window.localStorage.removeItem("currentWorkspaceId");
    showToast("You left the workspace.");
    router.push("/workspaces");
  }

  async function createProject(input: CreateProjectInput): Promise<void> {
    if (!currentWorkspace) throw new Error("Select a workspace first.");
    const project = (await projectApi.create(
      currentWorkspace.id,
      input,
    )) as WorkspaceProject;
    setProjects((items) => [...items, project]);
    setActiveProjectId(project.id);
    setCurrentWorkspace((workspace) =>
      workspace
        ? { ...workspace, projectCount: workspace.projectCount + 1 }
        : workspace,
    );
    showToast(`${project.name} created successfully.`);
  }

  async function addSprint(input: CreateSprintInput): Promise<void> {
    if (!currentWorkspace || !activeProjectId) {
      throw new Error("Select a project first.");
    }
    const requestKey = `${currentWorkspace.id}:${activeProjectId}`;
    const sprint = await sprintApi.create(
      currentWorkspace.id,
      activeProjectId,
      input,
    );
    if (sprintLoadKey.current === requestKey) {
      setSprints((items) => [sprint, ...items]);
    }
    showToast(`${sprint.name} planned successfully.`);
  }

  async function updateSprintStatus(
    sprintId: string,
    status: Extract<SprintStatus, "ACTIVE" | "COMPLETED">,
  ): Promise<void> {
    if (!currentWorkspace || !activeProjectId) {
      throw new Error("Select a project first.");
    }
    const requestKey = `${currentWorkspace.id}:${activeProjectId}`;
    const updated = await sprintApi.updateStatus(
      currentWorkspace.id,
      activeProjectId,
      sprintId,
      { status },
    );
    if (sprintLoadKey.current === requestKey) {
      setSprints((items) =>
        items.map((sprint) => (sprint.id === sprintId ? updated : sprint)),
      );
    }
    showToast(status === "ACTIVE" ? "Sprint started." : "Sprint completed.");
  }

  const selector = (
    <WorkspaceSelector
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelect={selectWorkspace}
      onCreate={() => {
        setCreateError(null);
        setDialogOpen(true);
      }}
    />
  );
  const openMembers = () => setMembersOpen(true);
  const userSelector = (
    <CurrentUserSelector
      workspaceId={currentWorkspace?.id}
      currentUser={currentUser}
      currentRole={currentWorkspace?.currentUserRole}
      onOpenMembers={openMembers}
    />
  );

  return (
    <div className={styles.app}>
      {sidebarOpen && (
        <Sidebar
          activeView={activeView}
          onNavigate={navigate}
          workspaceSelector={selector}
          currentUserSelector={userSelector}
          projectCount={currentWorkspace?.projectCount ?? 0}
          currentUserName={currentUser?.name}
          currentUserRole={currentWorkspace?.currentUserRole}
          onOpenMembers={openMembers}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onAddProject={() => setProjectDialogOpen(true)}
        />
      )}
      <div className={styles.shell}>
        <Header
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          workspaceName={currentWorkspace?.name ?? "Workspaces"}
          projectName={
            projects.find((project) => project.id === activeProjectId)?.name
          }
          userName={currentUser?.name}
          userEmail={currentUser?.email}
          userAvatarUrl={currentUser?.avatarUrl}
        />
        {viewState === "loading" && <WorkspaceLoadingState />}
        {viewState === "empty" && (
          <WorkspaceEmptyState onCreate={() => setDialogOpen(true)} />
        )}
        {viewState === "error" && error && (
          <>
            <div className={styles.workspaceConnectionBanner}>
              <Icon name="alert" size={17} />
              <span>
                <b>
                  {error.unauthorized
                    ? "Authentication required"
                    : "Workspace API unavailable"}
                </b>
                {error.unauthorized
                  ? " Your session has expired. Sign in again to continue."
                  : ` ${error.message} The dashboard remains available in preview mode.`}
              </span>
              <button onClick={() => void load()}>Try again</button>
            </div>
            <DashboardView
              workspaceName={currentWorkspace?.name ?? "FormatWeaver HQ"}
              onGenerateReport={() =>
                showToast("Weekly report generation started.")
              }
            />
          </>
        )}
        {viewState === "ready" &&
          currentWorkspace &&
          (activeView === "Dashboard" ? (
            <DashboardView
              workspaceName={currentWorkspace.name}
              onGenerateReport={() =>
                showToast("Weekly report generation started.")
              }
            />
          ) : activeView === "Kanban Board" ? (
            <KanbanBoardView
              workspaceName={currentWorkspace.name}
              onNotify={showToast}
            />
          ) : activeView === "Sprints" ? (
            <SprintsView
              project={
                projects.find((project) => project.id === activeProjectId) ??
                null
              }
              sprints={sprints}
              onAddSprint={addSprint}
              onUpdateSprintStatus={updateSprintStatus}
              onOpenProjects={() => setProjectDialogOpen(true)}
              canManage={
                currentWorkspace.currentUserRole === "OWNER" ||
                currentWorkspace.currentUserRole === "ADMIN"
              }
              loading={sprintsLoading}
            />
          ) : (
            <WikiDocumentsView
              workspaceId={currentWorkspace.id}
              project={
                projects.find((project) => project.id === activeProjectId) ??
                null
              }
              onOpenProjects={() => setProjectDialogOpen(true)}
              onNotify={showToast}
            />
          ))}
      </div>
      <CreateWorkspaceDialog
        open={dialogOpen}
        loading={creating}
        error={createError}
        onClose={() => {
          setDialogOpen(false);
          setCreateError(null);
        }}
        onSubmit={createWorkspace}
      />
      {currentWorkspace && (
        <CreateProjectDialog
          open={projectDialogOpen}
          existingKeys={projects.map((project) => project.key)}
          onClose={() => setProjectDialogOpen(false)}
          onCreate={createProject}
        />
      )}
      {membersOpen && currentWorkspace && currentUser && (
        <MembersAccessDialog
          open={membersOpen}
          workspace={currentWorkspace}
          currentUser={currentUser}
          onClose={() => setMembersOpen(false)}
          onWorkspaceChanged={load}
          onLeft={leftWorkspace}
        />
      )}
      {membersOpen && (!currentWorkspace || !currentUser) && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMembersOpen(false);
          }}
        >
          <section
            className={styles.membersDialog}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.membersDialogHeading}>
              <div>
                <h2>Team Members Directory</h2>
                <p>
                  Member data requires an authenticated Workspace connection.
                </p>
              </div>
              <button onClick={() => setMembersOpen(false)}>Close</button>
            </div>
            <div className={styles.membersUnavailable}>
              <div className={`${styles.stateIcon} ${styles.errorStateIcon}`}>
                <Icon name="alert" size={25} />
              </div>
              <h3>Members are not loaded</h3>
              <p>
                {error?.message ??
                  "Connect to the Workspace API and sign in to load the member directory."}
              </p>
              <button onClick={() => void load()}>Retry connection</button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className={styles.toast}>
          <Icon name="check" size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}
