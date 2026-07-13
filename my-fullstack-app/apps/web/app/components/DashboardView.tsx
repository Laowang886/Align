import type { ReactNode } from "react";
import styles from "../page.module.css";
import Icon from "./Icon";
import type { IconName } from "./types";

function MetricCard({ icon, tone, label, value, children }: { icon: IconName; tone: string; label: string; value: string; children: ReactNode }) {
  return <article className={styles.metricCard}><div className={`${styles.metricIcon} ${styles[tone]}`}><Icon name={icon} size={23} /></div><div className={styles.metricCopy}><span className={styles.eyebrow}>{label}</span><strong>{value}</strong>{children}</div></article>;
}

export default function DashboardView({ onGenerateReport, workspaceName = "FormatWeaver HQ" }: { onGenerateReport: () => void; workspaceName?: string }) {
  const members = [{ name: "Renbo", done: 1, remaining: 1 }, { name: "Alice", done: 1, remaining: 1 }, { name: "Bob", done: 0, remaining: 1 }, { name: "Unassigned", done: 0, remaining: 1 }];
  return <main id="main" className={styles.main}>
    <div className={styles.hero}><div><h1>Workspace Overview</h1><p>Analytics performance and collaborative summaries for <b>{workspaceName}</b></p></div><button className={styles.reportButton} onClick={onGenerateReport}><Icon name="sparkles" size={19} />Generate AI Weekly Report</button></div>
    <section className={styles.metrics}>
      <MetricCard icon="clipboard" tone="indigo" label="ACTIVE PROJECTS" value="2"><span className={styles.purple}>2 currently active</span></MetricCard>
      <MetricCard icon="check" tone="green" label="TASKS DELIVERED" value="2 / 6"><div className={styles.progress}><i /></div><span className={styles.greenText}>33% Completion Rate</span></MetricCard>
      <MetricCard icon="trend" tone="rose" label="SPRINT POINTS" value="7 / 26 SP"><span className={styles.redText}>19 pending estimation</span></MetricCard>
      <MetricCard icon="calendar" tone="amber" label="ACTIVE SPRINT" value="Sprint 2: Kanban &amp; Analytics"><span className={styles.orangeText}>Goal: Implement fluid drag &amp; drop colu...</span></MetricCard>
    </section>
    <section className={styles.analytics}>
      <article className={styles.panel}><h2>Team Workload Distribution</h2><p>Total tasks allocated per team member in current workspace</p><div className={styles.chartArea}><div className={styles.yAxis}><span>2</span><span>1.5</span><span>1</span><span>0.5</span><span>0</span></div><div className={styles.bars}>{members.map((member) => <div className={styles.barGroup} key={member.name}><div className={styles.bar}><i style={{height:`${member.done*50}%`}} /><b style={{height:`${member.remaining*50}%`}} /></div><span>{member.name}</span></div>)}</div></div><div className={styles.barLegend}><span><i className={styles.doneDot} />Done Task</span><span><i className={styles.remainingDot} />Remaining Task</span></div></article>
      <article className={styles.panel}><h2>Task Status Metrics</h2><p>Task category breakdown inside workspace pipeline</p><div className={styles.donutWrap}><div className={styles.donut} /></div><div className={styles.legend}><span><i className={styles.backlog} />Backlog (1)</span><span><i className={styles.todo} />To Do (1)</span><span><i className={styles.review} />In Progress / Review (2)</span><span><i className={styles.completed} />Completed Done (2)</span></div></article>
    </section>
    <section className={styles.insights}>
      <article className={styles.insightPanel}><div className={styles.panelHeading}><Icon name="alert" size={18} /><div><h2>Approaching Deadlines</h2><p>Remaining pending tasks with due dates specified</p></div></div><div className={styles.deadlineList}>{[["FW-105","URGENT","urgent","Finish dashboard data integration","Jul 12, 2026"],["FW-109","HIGH","high","Review sprint analytics metrics","Jul 15, 2026"],["FW-112","MEDIUM","medium","Prepare stakeholder release notes","Jul 18, 2026"]].map(([code,priority,tone,title,date]) => <div className={styles.deadline} key={code}><div><span className={styles.taskCode}>{code}</span><span className={`${styles.priority} ${styles[tone!]}`}>{priority}</span><b>{title}</b></div><time><small>Due Date</small>{date}</time></div>)}</div></article>
      <article className={styles.insightPanel}><div className={`${styles.panelHeading} ${styles.activityHeading}`}><Icon name="activity" size={18} /><div><h2>Activity Log &amp; Audit Trail</h2><p>Chronological history of operations in this tenant</p></div></div><div className={styles.activityList}>{[["R","Renbo","Jul 10 · 10:42 AM","updated task status","Implement workspace dashboard analytics"],["A","Alice","Jul 10 · 9:18 AM","completed task","Define reusable task status pipeline"],["B","Bob","Jul 9 · 4:36 PM","added a comment","Kanban drag and drop interaction"]].map(([initial,name,time,action,task]) => <div className={styles.activityItem} key={`${name}-${time}`}><i>{initial}</i><div><span><b>{name}</b><time>{time}</time></span><p><strong>{action}</strong><em>{task}</em></p></div></div>)}</div></article>
    </section>
  </main>;
}
