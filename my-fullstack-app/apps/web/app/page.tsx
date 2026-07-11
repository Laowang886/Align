"use client";

import { useState, type ReactNode } from "react";
import styles from "./page.module.css";

type IconName =
  | "menu" | "external" | "bell" | "chevron" | "user" | "dashboard"
  | "board" | "clock" | "book" | "chat" | "users" | "clipboard"
  | "check" | "trend" | "calendar" | "sparkles" | "plus";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    external: <><path d="M14 3h7v7M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    board: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M16 4v16" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    book: <><path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v18H6.5A3.5 3.5 0 0 0 3 23zM21 5.5A3.5 3.5 0 0 0 17.5 2H13v18h4.5A3.5 3.5 0 0 1 21 23z" /></>,
    chat: <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 10h6M9 14h6" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7zM5 13l.9 2.1L8 16l-2.1.9L5 19l-.9-2.1L2 16l2.1-.9z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const navItems: { label: string; icon: IconName }[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Kanban Board", icon: "board" },
  { label: "Sprints", icon: "clock" },
  { label: "Wiki Documents", icon: "book" },
  { label: "Workspace Chat", icon: "chat" },
];

function MetricCard({ icon, tone, label, value, children }: { icon: IconName; tone: string; label: string; value: string; children: ReactNode }) {
  return <article className={styles.metricCard}>
    <div className={`${styles.metricIcon} ${styles[tone]}`}><Icon name={icon} size={23} /></div>
    <div className={styles.metricCopy}><span className={styles.eyebrow}>{label}</span><strong>{value}</strong>{children}</div>
  </article>;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [active, setActive] = useState("Dashboard");
  const [toast, setToast] = useState(false);

  function generateReport() {
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  }

  return <div className={styles.app}>
    {sidebarOpen && <aside className={styles.sidebar}>
      <div className={styles.brand}><div className={styles.logo}>SF</div><div><b>SprintForge</b><span>SAAS CONSOLE</span></div></div>
      <button className={styles.switcher}><span><small>WORKSPACE</small><b>FormatWeaver HQ</b></span><Icon name="chevron" size={15} /></button>
      <button className={styles.userSwitch}><span className={styles.userLabel}><Icon name="user" size={13} /> SIMULATE USER</span><span className={styles.userRow}><i>R</i><span><b>Renbo</b><small>Owner Role</small></span><Icon name="chevron" size={15} /></span></button>
      <p className={styles.sectionTitle}>MENU</p>
      <nav className={styles.nav}>{navItems.map(item => <button key={item.label} className={active === item.label ? styles.activeNav : ""} onClick={() => setActive(item.label)}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}</nav>
      <div className={styles.projectsHead}><span>PROJECTS (2)</span><Icon name="plus" size={16} /></div>
      <button className={styles.allProjects}><i />All Projects</button>
      <div className={styles.sidebarBottom}><button><Icon name="users" size={19} />Members &amp; Access</button><div className={styles.owner}><i>R</i><span><b>Renbo</b><small>Owner</small></span></div></div>
    </aside>}

    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}><button className={styles.iconButton} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar"><Icon name="menu" /></button><span>FormatWeaver HQ</span></div>
        <div className={styles.headerRight}><a href="#main" className={styles.openTab}>Open Tab <Icon name="external" size={14} /></a><button className={styles.bell} aria-label="Notifications"><Icon name="bell" /><i /></button><div className={styles.profileAvatar}>R</div><div className={styles.profileText}><b>Renbo</b><span>wenshuowenshuo886@gmail.com</span></div></div>
      </header>

      <main id="main" className={styles.main}>
        <div className={styles.hero}><div><h1>Workspace Overview</h1><p>Analytics performance and collaborative summaries for <b>FormatWeaver HQ</b></p></div><button className={styles.reportButton} onClick={generateReport}><Icon name="sparkles" size={19} />Generate AI Weekly Report</button></div>

        <section className={styles.metrics}>
          <MetricCard icon="clipboard" tone="indigo" label="ACTIVE PROJECTS" value="2"><span className={styles.purple}>2 currently active</span></MetricCard>
          <MetricCard icon="check" tone="green" label="TASKS DELIVERED" value="2 / 6"><div className={styles.progress}><i /></div><span className={styles.greenText}>33% Completion Rate</span></MetricCard>
          <MetricCard icon="trend" tone="rose" label="SPRINT POINTS" value="7 / 26 SP"><span className={styles.redText}>19 pending estimation</span></MetricCard>
          <MetricCard icon="calendar" tone="amber" label="ACTIVE SPRINT" value="Sprint 2: Kanban &amp; Analytics"><span className={styles.orangeText}>Goal: Implement fluid drag &amp; drop colu...</span></MetricCard>
        </section>

        <section className={styles.analytics}>
          <article className={styles.panel}><h2>Team Workload Distribution</h2><p>Total tasks allocated per team member in current workspace</p><div className={styles.chartArea}><div className={styles.yAxis}><span>2</span><span>1.5</span><span>1</span><span>0.5</span><span>0</span></div><div className={styles.bars}>{([{ name: "Renbo", done: 1, remaining: 1 }, { name: "Alice", done: 1, remaining: 1 }, { name: "Bob", done: 0, remaining: 1 }, { name: "Unassigned", done: 0, remaining: 1 }]).map((member) => <div className={styles.barGroup} key={member.name}><div className={styles.bar}><i style={{height:`${member.done*50}%`}} /><b style={{height:`${member.remaining*50}%`}} /></div><span>{member.name}</span></div>)}</div></div><div className={styles.barLegend}><span><i className={styles.doneDot} />Done Task</span><span><i className={styles.remainingDot} />Remaining Task</span></div></article>
          <article className={styles.panel}><h2>Task Status Metrics</h2><p>Task category breakdown inside workspace pipeline</p><div className={styles.donutWrap}><div className={styles.donut} /></div><div className={styles.legend}><span><i className={styles.backlog} />Backlog (1)</span><span><i className={styles.todo} />To Do (1)</span><span><i className={styles.review} />In Progress / Review (2)</span><span><i className={styles.completed} />Completed Done (2)</span></div></article>
        </section>
      </main>
    </div>
    {toast && <div className={styles.toast}><Icon name="check" size={19} />Weekly report generation started.</div>}
  </div>;
}
