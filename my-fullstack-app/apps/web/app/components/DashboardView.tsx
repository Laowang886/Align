"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type {
  ColumnCategory,
  WeeklyReport,
  WorkspaceDashboard,
} from "@repo/shared";
import { ApiError, dashboardApi } from "../../lib/api-client";
import styles from "../page.module.css";
import Icon from "./Icon";
import type { IconName } from "./types";

function MetricCard({
  icon,
  tone,
  label,
  value,
  children,
}: {
  icon: IconName;
  tone: string;
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>
        <Icon name={icon} size={23} />
      </div>
      <div className={styles.metricCopy}>
        <span className={styles.eyebrow}>{label}</span>
        <strong>{value}</strong>
        {children}
      </div>
    </article>
  );
}

const categoryLabels: Record<ColumnCategory, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};
const categoryColors: Record<ColumnCategory, string> = {
  BACKLOG: "#94a6be",
  TODO: "#36b5e8",
  IN_PROGRESS: "#6063ed",
  REVIEW: "#8b5cf6",
  DONE: "#10b980",
};

export default function DashboardView({
  workspaceId,
  workspaceName = "Workspace",
  refreshKey = 0,
  onOpenProject,
}: {
  workspaceId?: string;
  workspaceName?: string;
  refreshKey?: number;
  onOpenProject?: (projectId: string) => void;
}) {
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setError("Select a workspace to load its dashboard.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDashboard(await dashboardApi.get(workspaceId));
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load dashboard analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const donut = useMemo(() => {
    if (!dashboard) return "#e2e8f0 0 100%";
    const total = dashboard.statusBreakdown.reduce(
      (sum, item) => sum + item.count,
      0,
    );
    if (!total) return "#e2e8f0 0 100%";
    let cursor = 0;
    return dashboard.statusBreakdown
      .map((item) => {
        const start = cursor;
        cursor += (item.count / total) * 100;
        return `${categoryColors[item.category]} ${start}% ${cursor}%`;
      })
      .join(",");
  }, [dashboard]);

  async function generateReport() {
    if (!workspaceId) return;
    setReportOpen(true);
    setReportLoading(true);
    setReportError(null);
    try {
      setReport(await dashboardApi.generateWeeklyReport(workspaceId));
    } catch (caught: unknown) {
      setReportError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to generate the report.",
      );
    } finally {
      setReportLoading(false);
    }
  }

  async function copyReport() {
    if (report) await navigator.clipboard.writeText(report.markdown);
  }

  function downloadReport() {
    if (!report) return;
    const url = URL.createObjectURL(
      new Blob([report.markdown], { type: "text/markdown" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-weekly-report.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !dashboard)
    return (
      <main id="main" className={styles.workspaceState}>
        <div className={styles.workspaceSpinner} />
        <h2>Loading workspace analytics</h2>
        <p>Aggregating projects, tasks, sprints, and activity.</p>
      </main>
    );
  if (error && !dashboard)
    return (
      <main id="main" className={styles.workspaceState}>
        <Icon name="alert" size={28} />
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
        <button onClick={() => void load()}>Try again</button>
      </main>
    );
  if (!dashboard) return null;

  const { metrics } = dashboard;
  const maxWorkload = Math.max(
    1,
    ...dashboard.workload.map((item) => item.done + item.remaining),
  );

  return (
    <main id="main" className={styles.main}>
      <div className={styles.hero}>
        <div>
          <h1>Workspace Overview</h1>
          <p>
            Live performance and collaborative summaries for{" "}
            <b>{workspaceName}</b>
          </p>
        </div>
        <button
          className={styles.reportButton}
          onClick={() => void generateReport()}
        >
          <Icon name="sparkles" size={19} />
          Generate AI Weekly Report
        </button>
      </div>
      <section className={styles.metrics}>
        <MetricCard
          icon="clipboard"
          tone="indigo"
          label="ACTIVE PROJECTS"
          value={String(metrics.activeProjects)}
        >
          <span className={styles.purple}>
            {metrics.activeProjects
              ? `${metrics.activeProjects} currently active`
              : "Create your first project"}
          </span>
        </MetricCard>
        <MetricCard
          icon="check"
          tone="green"
          label="TASKS DELIVERED"
          value={`${metrics.deliveredTasks} / ${metrics.totalTasks}`}
        >
          <div className={styles.progress}>
            <i style={{ width: `${metrics.completionRate}%` }} />
          </div>
          <span className={styles.greenText}>
            {metrics.completionRate}% Completion Rate
          </span>
        </MetricCard>
        <MetricCard
          icon="trend"
          tone="rose"
          label="SPRINT POINTS"
          value={`${metrics.completedStoryPoints} / ${metrics.totalStoryPoints} SP`}
        >
          <span className={styles.redText}>
            {metrics.unestimatedTasks} pending estimation
          </span>
        </MetricCard>
        <MetricCard
          icon="calendar"
          tone="amber"
          label="ACTIVE SPRINT"
          value={dashboard.activeSprint?.name ?? "No active sprint"}
        >
          <span className={styles.orangeText}>
            {dashboard.activeSprint
              ? `${dashboard.activeSprint.projectName}: ${dashboard.activeSprint.goal || "No goal set"}`
              : "Start a planned sprint to track delivery"}
          </span>
        </MetricCard>
      </section>
      <section className={styles.analytics}>
        <article className={styles.panel}>
          <h2>Team Workload Distribution</h2>
          <p>Total tasks allocated per team member in current workspace</p>
          {dashboard.workload.length ? (
            <>
              <div className={styles.chartArea}>
                <div className={styles.yAxis}>
                  <span>{maxWorkload}</span>
                  <span>{Math.round(maxWorkload * 0.75)}</span>
                  <span>{Math.round(maxWorkload * 0.5)}</span>
                  <span>{Math.round(maxWorkload * 0.25)}</span>
                  <span>0</span>
                </div>
                <div className={styles.bars}>
                  {dashboard.workload.map((member) => (
                    <div
                      className={styles.barGroup}
                      key={member.userId ?? "unassigned"}
                    >
                      <div className={styles.bar}>
                        <i
                          style={{
                            height: `${(member.done / maxWorkload) * 100}%`,
                          }}
                        />
                        <b
                          style={{
                            height: `${(member.remaining / maxWorkload) * 100}%`,
                          }}
                        />
                      </div>
                      <span title={member.name}>{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.barLegend}>
                <span>
                  <i className={styles.doneDot} />
                  Done Task
                </span>
                <span>
                  <i className={styles.remainingDot} />
                  Remaining Task
                </span>
              </div>
            </>
          ) : (
            <div className={styles.dashboardEmpty}>
              <p>No assigned tasks yet.</p>
            </div>
          )}
        </article>
        <article className={`${styles.panel} ${styles.taskStatusPanel}`}>
          <h2>Task Status Metrics</h2>
          <p>Task category breakdown inside workspace pipeline</p>
          <div className={styles.donutWrap}>
            <div
              className={styles.donut}
              style={{ background: `conic-gradient(${donut})` }}
            />
          </div>
          <div className={styles.legend}>
            {dashboard.statusBreakdown.map((item) => (
              <span key={item.category}>
                <i style={{ background: categoryColors[item.category] }} />
                {categoryLabels[item.category]} ({item.count})
              </span>
            ))}
          </div>
        </article>
      </section>
      <section className={styles.insights}>
        <article className={styles.insightPanel}>
          <div className={styles.panelHeading}>
            <Icon name="alert" size={18} />
            <div>
              <h2>Approaching Deadlines</h2>
              <p>Incomplete tasks ordered by due date</p>
            </div>
          </div>
          <div className={styles.deadlineList}>
            {dashboard.deadlines.length ? (
              dashboard.deadlines.map((task) => (
                <button
                  type="button"
                  className={styles.deadline}
                  key={task.id}
                  onClick={() => onOpenProject?.(task.projectId)}
                >
                  <div>
                    <span className={styles.taskCode}>{task.code}</span>
                    <span
                      className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}
                    >
                      {task.priority}
                    </span>
                    <b>{task.title}</b>
                    <small>{task.projectName}</small>
                  </div>
                  <time>
                    <small>Due Date</small>
                    {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}
                  </time>
                </button>
              ))
            ) : (
              <div className={styles.dashboardEmpty}>
                <p>No incomplete tasks with due dates.</p>
              </div>
            )}
          </div>
        </article>
        <article className={styles.insightPanel}>
          <div className={`${styles.panelHeading} ${styles.activityHeading}`}>
            <Icon name="activity" size={18} />
            <div>
              <h2>Activity Log &amp; Audit Trail</h2>
              <p>Recent database-backed workspace operations</p>
            </div>
          </div>
          <div className={styles.activityList}>
            {dashboard.activities.length ? (
              dashboard.activities.map((activity) => (
                <div className={styles.activityItem} key={activity.id}>
                  <i>{activity.actorName.charAt(0).toUpperCase()}</i>
                  <div>
                    <span>
                      <b>{activity.actorName}</b>
                      <time>
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(activity.createdAt))}
                      </time>
                    </span>
                    <p>
                      <strong>{activity.action}</strong>
                      <em>{activity.summary}</em>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.dashboardEmpty}>
                <p>Actions will appear here as the team starts working.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      {reportOpen && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => !reportLoading && setReportOpen(false)}
        >
          <section
            className={styles.weeklyReportDialog}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.weeklyReportHeader}>
              <div>
                <span>AI WEEKLY REPORT</span>
                <h2>{workspaceName}</h2>
                {report && <p>Generated with {report.model}</p>}
              </div>
              <button onClick={() => setReportOpen(false)}>×</button>
            </div>
            <div className={styles.weeklyReportBody}>
              {reportLoading ? (
                <div className={styles.workspaceState}>
                  <div className={styles.workspaceSpinner} />
                  <h2>Generating report</h2>
                  <p>Summarizing verified workspace data.</p>
                </div>
              ) : reportError ? (
                <div className={styles.workspaceState}>
                  <Icon name="alert" size={28} />
                  <h2>Report unavailable</h2>
                  <p>{reportError}</p>
                  <button onClick={() => void generateReport()}>
                    Try again
                  </button>
                </div>
              ) : report ? (
                <ReactMarkdown>{report.markdown}</ReactMarkdown>
              ) : null}
            </div>
            {report && !reportLoading && (
              <div className={styles.weeklyReportActions}>
                <button onClick={() => void generateReport()}>
                  Regenerate
                </button>
                <button onClick={() => void copyReport()}>Copy Markdown</button>
                <button onClick={downloadReport}>Download .md</button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
