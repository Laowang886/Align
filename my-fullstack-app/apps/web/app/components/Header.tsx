import styles from "../page.module.css";
import Icon from "./Icon";

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return <header className={styles.header}>
    <div className={styles.headerLeft}><button className={styles.iconButton} onClick={onToggleSidebar} aria-label="Toggle sidebar"><Icon name="menu" /></button><span>FormatWeaver HQ</span></div>
    <div className={styles.headerRight}><a href="#main" className={styles.openTab}>Open Tab <Icon name="external" size={14} /></a><button className={styles.bell} aria-label="Notifications"><Icon name="bell" /><i /></button><div className={styles.profileAvatar}>R</div><div className={styles.profileText}><b>Renbo</b><span>wenshuowenshuo886@gmail.com</span></div></div>
  </header>;
}
