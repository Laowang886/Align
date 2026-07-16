"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CreateSprintInput, Sprint, SprintStatus } from "@repo/shared";
import styles from "../page.module.css";
import Icon from "./Icon";
import type { WorkspaceProject } from "./workspace/project-planning-types";

type Props = {
  project: WorkspaceProject | null;
  sprints: Sprint[];
  onAddSprint: (input: CreateSprintInput) => Promise<void>;
  onUpdateSprintStatus: (
    sprintId: string,
    status: Extract<SprintStatus, "ACTIVE" | "COMPLETED">,
  ) => Promise<void>;
  onOpenProjects: () => void;
  canManage: boolean;
  loading: boolean;
};

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value}T12:00:00`));
}

export default function SprintsView({
  project,
  sprints,
  onAddSprint,
  onUpdateSprintStatus,
  onOpenProjects,
  canManage,
  loading,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingSprintId, setUpdatingSprintId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const projectSprints = useMemo(
    () => sprints.filter((sprint) => sprint.projectId === project?.id),
    [project?.id, sprints],
  );

  useEffect(() => {
    if (!modalOpen) return;
    titleRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [modalOpen]);

  function closeModal() {
    setModalOpen(false);
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    if (!name.trim() || !startDate || !endDate)
      return setError("Sprint title and both dates are required.");
    if (endDate < startDate)
      return setError("End date must be on or after the start date.");
    setSubmitting(true);
    try {
      await onAddSprint({
        name: name.trim(),
        ...(goal.trim() ? { goal: goal.trim() } : {}),
        startDate,
        endDate,
      });
      closeModal();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create sprint.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(
    sprintId: string,
    status: Extract<SprintStatus, "ACTIVE" | "COMPLETED">,
  ) {
    setActionError("");
    setUpdatingSprintId(sprintId);
    try {
      await onUpdateSprintStatus(sprintId, status);
    } catch (caught: unknown) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "Unable to update sprint status.",
      );
    } finally {
      setUpdatingSprintId(null);
    }
  }

  if (!project)
    return (
      <main className={styles.sprintsEmpty}>
        <span>
          <Icon name="clock" size={29} />
        </span>
        <h1>Create a project before planning sprints</h1>
        <p>
          Projects keep sprint milestones and backlog work organized in one
          place.
        </p>
        <button type="button" onClick={onOpenProjects}>
          <Icon name="plus" size={17} />
          Create Project
        </button>
      </main>
    );

  return (
    <main id="main" className={styles.sprintsMain}>
      <header className={styles.sprintsHero}>
        <div>
          <h1>
            <strong>[{project.key}]</strong> Sprint Planning Hub
          </h1>
          <p>
            Define sprint milestones, allocate tasks, monitor completion
            velocity, and consult AI scrum coaches.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={!canManage}
          title={
            !canManage
              ? "Only workspace owners and admins can plan sprints"
              : undefined
          }
        >
          <Icon name="plus" size={18} />
          Plan New Sprint
        </button>
      </header>
      {actionError && (
        <div className={styles.sprintFormError}>{actionError}</div>
      )}
      <div className={styles.sprintsGrid}>
        <section className={styles.sprintColumn}>
          <h2>
            <Icon name="clock" size={18} />
            Milestone Sprints ({projectSprints.length})
          </h2>
          {loading && (
            <div className={styles.noSprints}>Loading sprints...</div>
          )}
          {!loading &&
            projectSprints.map((sprint) => (
              <article key={sprint.id} className={styles.sprintCard}>
                <div className={styles.sprintCardHead}>
                  <div>
                    <div className={styles.sprintTitle}>
                      <h3>{sprint.name}</h3>
                      <span className={styles[`sprint${sprint.status}`]}>
                        {sprint.status}
                      </span>
                    </div>
                    {sprint.goal && <p>Goal: {sprint.goal}</p>}
                    <time>
                      <Icon name="calendar" size={14} />
                      {formatDate(sprint.startDate)} —{" "}
                      {formatDate(sprint.endDate)}
                    </time>
                  </div>
                  <div className={styles.sprintActions}>
                    {sprint.status === "PLANNED" && (
                      <button
                        type="button"
                        onClick={() => void updateStatus(sprint.id, "ACTIVE")}
                        disabled={!canManage || updatingSprintId === sprint.id}
                      >
                        Start Sprint
                      </button>
                    )}
                    {sprint.status === "ACTIVE" && (
                      <button
                        type="button"
                        className={styles.completeSprint}
                        onClick={() =>
                          void updateStatus(sprint.id, "COMPLETED")
                        }
                        disabled={!canManage || updatingSprintId === sprint.id}
                      >
                        Complete Sprint
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.coachButton}
                      onClick={() =>
                        setSummaries((current) => ({
                          ...current,
                          [sprint.id]: current[sprint.id]
                            ? ""
                            : "No tasks are assigned yet. Add backlog items to establish velocity and delivery-risk insights.",
                        }))
                      }
                    >
                      <Icon name="sparkles" size={14} />
                      Coach Summary
                    </button>
                  </div>
                </div>
                {summaries[sprint.id] && (
                  <div className={styles.coachSummary}>
                    <Icon name="sparkles" size={14} />
                    <p>
                      <b>Agile Coach Report</b>
                      {summaries[sprint.id]}
                    </p>
                  </div>
                )}
                <div className={styles.sprintMetrics}>
                  <div>
                    <small>TASKS COMPLETED</small>
                    <b>0 / 0 Tasks</b>
                  </div>
                  <div>
                    <small>STORY POINTS</small>
                    <b>0 / 0 SP</b>
                  </div>
                  <div>
                    <small>DELIVERANCE RATE</small>
                    <b>0%</b>
                  </div>
                </div>
                <div className={styles.sprintDropzone}>
                  Drag items from Backlog into this Sprint below.
                </div>
              </article>
            ))}
          {!loading && projectSprints.length === 0 && (
            <div className={styles.noSprints}>
              <Icon name="clock" size={33} />
              <b>No planned Sprints found.</b>
              <span>Plan a sprint to bundle milestone accomplishments.</span>
            </div>
          )}
        </section>
        <aside className={styles.backlogColumn}>
          <h2>
            <Icon name="clipboard" size={18} />
            Project Backlog (0)
          </h2>
          <div className={styles.backlogPanel}>
            <b>Unassigned tasks. Allocate them to planned sprints.</b>
            <div>
              <Icon name="check" size={39} />
              <p>Backlog cleared! All tasks assigned to active milestones.</p>
            </div>
          </div>
        </aside>
      </div>
      {modalOpen && (
        <div
          className={styles.sprintModalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className={styles.sprintModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sprint-modal-title"
          >
            <h2 id="sprint-modal-title">Create Milestone Sprint</h2>
            <p>
              Sprint cycles organize development targets with dates and story
              estimations.
            </p>
            <form onSubmit={submit}>
              <label>
                <span>SPRINT TITLE</span>
                <input
                  ref={titleRef}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  placeholder="e.g. Sprint 2: Product launch"
                />
              </label>
              <label>
                <span>SCRUM GOAL</span>
                <input
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="e.g. Deliver the release-ready experience"
                />
              </label>
              <div className={styles.sprintDateGrid}>
                <label>
                  <span>START DATE</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setError("");
                    }}
                  />
                </label>
                <label>
                  <span>END DATE</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setError("");
                    }}
                  />
                </label>
              </div>
              {error && <div className={styles.sprintFormError}>{error}</div>}
              <div className={styles.sprintModalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? "Planning..." : "Plan Sprint"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
