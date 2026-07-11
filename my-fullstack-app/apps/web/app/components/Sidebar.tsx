import styles from "../page.module.css";
import Icon from "./Icon";
import type { NavigationItem } from "./types";

const navigation: NavigationItem[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Kanban Board", icon: "board" },
  { label: "Sprints", icon: "clock" },
  { label: "Wiki Documents", icon: "book" },
  { label: "Workspace Chat", icon: "chat" },
];

type SidebarProps = {
  activeView: string;
  onNavigate: (view: string) => void;
};

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return <aside className={styles.sidebar}>
    <div className={styles.brand}><div className={styles.logo}>SF</div><div><b>SprintForge</b><span>SAAS CONSOLE</span></div></div>
    <button className={styles.switcher}><span><small>WORKSPACE</small><b>FormatWeaver HQ</b></span><Icon name="chevron" size={15} /></button>
    <button className={styles.userSwitch}><span className={styles.userLabel}><Icon name="user" size={13} /> SIMULATE USER</span><span className={styles.userRow}><i>R</i><span><b>Renbo</b><small>Owner Role</small></span><Icon name="chevron" size={15} /></span></button>
    <p className={styles.sectionTitle}>MENU</p>
    <nav className={styles.nav}>{navigation.map((item) => <button key={item.label} className={activeView === item.label ? styles.activeNav : ""} onClick={() => onNavigate(item.label)}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}</nav>
    <div className={styles.projectsHead}><span>PROJECTS (2)</span><Icon name="plus" size={16} /></div>
    <button className={styles.allProjects}><i />All Projects</button>
    <div className={styles.sidebarBottom}><button><Icon name="users" size={19} />Members &amp; Access</button><div className={styles.owner}><i>R</i><span><b>Renbo</b><small>Owner</small></span></div></div>
  </aside>;
}
