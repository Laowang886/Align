import type { WorkspaceDetails } from "@repo/shared";
import styles from "../../page.module.css";
import Icon from "../Icon";

export default function WorkspaceDashboard({ workspace, onCreateWorkspace }: { workspace: WorkspaceDetails; onCreateWorkspace: () => void }) {
  return <main id="main" className={styles.main}>
    <div className={styles.hero}><div><span className={styles.workspaceRoleBadge}>{workspace.currentUserRole}</span><h1>{workspace.name}</h1><p>{workspace.description ?? "Your team workspace overview and project activity."}</p></div><button className={styles.secondaryAction} onClick={onCreateWorkspace}><Icon name="plus" size={17} />New Workspace</button></div>
    <section className={styles.workspaceMetrics}>
      <article><div className={`${styles.metricIcon} ${styles.indigo}`}><Icon name="users" size={23} /></div><div><span>MEMBERS</span><strong>{workspace.memberCount}</strong><small>{workspace.memberCount === 1 ? "1 teammate in this workspace" : `${workspace.memberCount} teammates in this workspace`}</small></div></article>
      <article><div className={`${styles.metricIcon} ${styles.green}`}><Icon name="clipboard" size={23} /></div><div><span>PROJECTS</span><strong>{workspace.projectCount}</strong><small>{workspace.projectCount === 0 ? "Ready for your first project" : `${workspace.projectCount} active projects`}</small></div></article>
      <article><div className={`${styles.metricIcon} ${styles.amber}`}><Icon name="user" size={23} /></div><div><span>YOUR ROLE</span><strong className={styles.roleMetric}>{workspace.currentUserRole}</strong><small>Workspace access level</small></div></article>
    </section>
    <section className={styles.workspaceDashboardGrid}>
      <article className={styles.workspacePanel}><div className={styles.workspacePanelHeading}><div><h2>Projects</h2><p>Projects belonging to this workspace</p></div></div>{workspace.projectCount === 0 ? <div className={styles.inlineEmpty}><Icon name="clipboard" size={25} /><h3>No projects yet</h3><p>Project creation will be available in the next workspace feature phase.</p></div> : <div className={styles.inlineEmpty}><strong>{workspace.projectCount}</strong><p>projects are connected to this workspace.</p></div>}</article>
      <article className={styles.workspacePanel}><div className={styles.workspacePanelHeading}><div><h2>Recent Activity</h2><p>Latest changes across your workspace</p></div></div><div className={styles.inlineEmpty}><Icon name="activity" size={25} /><h3>No recent activity</h3><p>Workspace actions will appear here as your team starts working.</p></div></article>
    </section>
  </main>;
}
