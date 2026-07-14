import styles from "../page.module.css";
import Icon from "./Icon";

export default function Header({
  onToggleSidebar,
  workspaceName = "FormatWeaver HQ",
  projectName,
  userName = "Renbo",
  userEmail = "wenshuowenshuo886@gmail.com",
}: {
  onToggleSidebar: () => void;
  workspaceName?: string;
  projectName?: string;
  userName?: string;
  userEmail?: string;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          className={styles.iconButton}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" />
        </button>
        <span className={styles.headerBreadcrumb}>
          <span>{workspaceName}</span>
          {projectName && (
            <>
              <i>/</i>
              <b>{projectName}</b>
            </>
          )}
        </span>
      </div>
      <div className={styles.headerRight}>
        <a href="#main" className={styles.openTab}>
          Open Tab <Icon name="external" size={14} />
        </a>
        <button className={styles.bell} aria-label="Notifications">
          <Icon name="bell" />
          <i />
        </button>
        <div className={styles.profileAvatar}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className={styles.profileText}>
          <b>{userName}</b>
          <span>{userEmail}</span>
        </div>
      </div>
    </header>
  );
}
