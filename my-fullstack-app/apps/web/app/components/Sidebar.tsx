import styles from "../page.module.css";
import Icon from "./Icon";
import type { NavigationItem } from "./types";
import type { ReactNode } from "react";

type SidebarProject = {
  id: string;
  name: string;
  color: string;
};

const navigation: NavigationItem[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Kanban Board", icon: "board" },
  { label: "Sprints", icon: "clock" },
  { label: "Wiki Documents", icon: "book" },
  { label: "Workspace Chat", icon: "chat" },
  { label: "AI Chat", icon: "sparkles" },
];

type SidebarProps = {
  activeView: string;
  onNavigate: (view: string) => void;
  workspaceSelector?: ReactNode;
  projectCount?: number;
  currentUserName?: string;
  currentUserRole?: string;
  onOpenMembers?: () => void;
  currentUserSelector?: ReactNode;
  projects?: SidebarProject[];
  activeProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  onAddProject?: () => void;
};

export default function Sidebar({
  activeView,
  onNavigate,
  workspaceSelector,
  projectCount = 2,
  currentUserName = "Renbo",
  currentUserRole = "Owner",
  onOpenMembers,
  currentUserSelector,
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>SF</div>
        <div>
          <b>SprintForge</b>
          <span>SAAS CONSOLE</span>
        </div>
      </div>
      {workspaceSelector ?? (
        <button className={styles.switcher}>
          <span>
            <small>WORKSPACE</small>
            <b>FormatWeaver HQ</b>
          </span>
          <Icon name="chevron" size={15} />
        </button>
      )}
      {currentUserSelector ?? (
        <div className={styles.userSwitch}>
          <span className={styles.userLabel}>
            <Icon name="user" size={13} /> CURRENT USER
          </span>
          <span className={styles.userRow}>
            <i>{currentUserName.charAt(0).toUpperCase()}</i>
            <span>
              <b>{currentUserName}</b>
              <small>{currentUserRole} Role</small>
            </span>
          </span>
        </div>
      )}
      <p className={styles.sectionTitle}>MENU</p>
      <nav className={styles.nav}>
        {navigation.map((item) => (
          <button
            key={item.label}
            className={activeView === item.label ? styles.activeNav : ""}
            onClick={() => onNavigate(item.label)}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className={styles.projectsHead}>
        <span>PROJECTS ({projects?.length ?? projectCount})</span>
        <button
          type="button"
          onClick={onAddProject}
          aria-label="Add project"
          title="Add project"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      <div className={styles.projectList}>
        {projects?.map((project) => (
          <button
            key={project.id}
            type="button"
            className={
              activeProjectId === project.id ? styles.activeProject : ""
            }
            onClick={() => onSelectProject?.(project.id)}
          >
            <i style={{ background: project.color }} />
            {project.name}
          </button>
        ))}
        {!projects && (
          <button className={styles.allProjects}>
            <i />
            All Projects
          </button>
        )}
        {projects?.length === 0 && (
          <button
            type="button"
            className={styles.emptyProjectButton}
            onClick={onAddProject}
          >
            <Icon name="plus" size={14} />
            Add your first project
          </button>
        )}
      </div>
      <div className={styles.sidebarBottom}>
        <button onClick={onOpenMembers}>
          <Icon name="users" size={19} />
          Members &amp; Access
        </button>
        <div className={styles.owner}>
          <i>{currentUserName.charAt(0).toUpperCase()}</i>
          <span>
            <b>{currentUserName}</b>
            <small>{currentUserRole}</small>
          </span>
        </div>
      </div>
    </aside>
  );
}
