import styles from "../../page.module.css";
import Icon from "../Icon";

export function WorkspaceLoadingState() {
  return <main className={styles.workspaceState}><div className={styles.loadingSpinner} /><h2>Loading workspace</h2><p>Fetching your workspace data...</p></main>;
}

export function WorkspaceEmptyState({ onCreate }: { onCreate: () => void }) {
  return <main className={styles.workspaceState}><div className={styles.stateIcon}><Icon name="clipboard" size={28} /></div><h2>Create your first workspace</h2><p>Workspaces keep your team, projects and activity organized in one place.</p><button onClick={onCreate}><Icon name="plus" size={17} />Create Workspace</button></main>;
}

export function WorkspaceErrorState({ message, unauthorized, onRetry }: { message: string; unauthorized: boolean; onRetry: () => void }) {
  return <main className={styles.workspaceState}><div className={`${styles.stateIcon} ${styles.errorStateIcon}`}><Icon name="alert" size={28} /></div><h2>{unauthorized ? "Authentication required" : "Workspace unavailable"}</h2><p>{unauthorized ? "Your session has expired. Sign in again to continue." : message}</p><button onClick={onRetry}>Try again</button></main>;
}
