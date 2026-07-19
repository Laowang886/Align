"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ColumnCategory,
  KanbanBoard,
  KanbanColumn,
  KanbanTask,
  Sprint,
  TaskPriority,
  WorkspaceMember,
} from "@repo/shared";
import { ApiError, kanbanApi, workspaceApi } from "../../lib/api-client";
import styles from "../page.module.css";
import Icon from "./Icon";

type Props = {
  onNotify: (message: string) => void;
  onDataChanged?: () => void;
  projectId?: string | null;
  workspaceId?: string;
  workspaceName?: string;
  sprints?: Sprint[];
  initialTaskId?: string;
};

type TaskForm = {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  storyPoints: string;
  sprintId: string;
  columnId: string;
};

type ColumnForm = {
  title: string;
  color: string;
  category: ColumnCategory;
};

const priorities: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const categories: ColumnCategory[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
];
const colors = ["gray", "blue", "amber", "purple", "green", "red"];
const colorClasses: Record<string, string> = {
  gray: "kanbanGray",
  blue: "kanbanBlue",
  amber: "kanbanAmber",
  purple: "kanbanPurple",
  green: "kanbanGreen",
  red: "kanbanRed",
};

function emptyTask(columnId = ""): TaskForm {
  return {
    title: "",
    description: "",
    priority: "MEDIUM",
    assigneeId: "",
    dueDate: "",
    storyPoints: "",
    sprintId: "",
    columnId,
  };
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export default function KanbanBoardView({
  onNotify,
  onDataChanged,
  projectId,
  workspaceId,
  workspaceName = "this workspace",
  sprints = [],
  initialTaskId,
}: Props) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all",
  );
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTask());
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [columnForm, setColumnForm] = useState<ColumnForm>({
    title: "",
    color: "gray",
    category: "TODO",
  });
  const boardRequestVersion = useRef(0);
  const openedDeepLinkRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId || !projectId) {
      boardRequestVersion.current += 1;
      setBoard(null);
      return;
    }
    const requestVersion = ++boardRequestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const [loadedBoard, loadedMembers] = await Promise.all([
        kanbanApi.get(workspaceId, projectId),
        workspaceApi.members(workspaceId),
      ]);
      if (requestVersion !== boardRequestVersion.current) return;
      setBoard(loadedBoard);
      setMembers(loadedMembers);
      const linkedTask = initialTaskId
        ? loadedBoard.columns
            .flatMap((column) => column.tasks)
            .find((task) => task.id === initialTaskId)
        : undefined;
      if (linkedTask && openedDeepLinkRef.current !== linkedTask.id) {
        openedDeepLinkRef.current = linkedTask.id;
        setEditingTask(linkedTask);
        setTaskForm(taskFormFor(linkedTask));
        setTaskModalOpen(true);
      }
    } catch (caught: unknown) {
      if (requestVersion !== boardRequestVersion.current) return;
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load the board.",
      );
    } finally {
      if (requestVersion === boardRequestVersion.current) setLoading(false);
    }
  }, [initialTaskId, projectId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tasks = useMemo(
    () => board?.columns.flatMap((column) => column.tasks) ?? [],
    [board],
  );
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const assignee = task.assignee?.name ?? "Unassigned";
      return (
        (priorityFilter === "all" || task.priority === priorityFilter) &&
        (!query ||
          `${task.code} ${task.title} ${assignee}`
            .toLowerCase()
            .includes(query))
      );
    });
  }, [priorityFilter, search, tasks]);

  function changeTaskForm<K extends keyof TaskForm>(
    key: K,
    value: TaskForm[K],
  ) {
    setTaskForm((current) => ({ ...current, [key]: value }));
  }

  function openTask(columnId?: string, task?: KanbanTask) {
    const selectedColumn =
      columnId ?? task?.columnId ?? board?.columns[0]?.id ?? "";
    setEditingTask(task ?? null);
    setTaskForm(
      task ? taskFormFor(task, selectedColumn) : emptyTask(selectedColumn),
    );
    setTaskModalOpen(true);
  }

  async function submitTask(event: React.FormEvent) {
    event.preventDefault();
    if (
      !workspaceId ||
      !projectId ||
      !taskForm.title.trim() ||
      !taskForm.columnId
    )
      return;
    setPending(true);
    try {
      const input = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        priority: taskForm.priority,
        assigneeId: taskForm.assigneeId || null,
        dueDate: taskForm.dueDate || null,
        storyPoints:
          taskForm.storyPoints === "" ? null : Number(taskForm.storyPoints),
        sprintId: taskForm.sprintId || null,
      };
      if (editingTask) {
        await kanbanApi.updateTask(
          workspaceId,
          projectId,
          editingTask.id,
          input,
        );
        if (editingTask.columnId !== taskForm.columnId) {
          await kanbanApi.moveTask(workspaceId, projectId, editingTask.id, {
            columnId: taskForm.columnId,
          });
        }
        onNotify("Task updated successfully.");
      } else {
        await kanbanApi.createTask(workspaceId, projectId, {
          ...input,
          columnId: taskForm.columnId,
        });
        onNotify("Task created successfully.");
      }
      setTaskModalOpen(false);
      await load();
      onDataChanged?.();
    } catch (caught: unknown) {
      onNotify(
        caught instanceof ApiError ? caught.message : "Unable to save task.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteTask(task: KanbanTask) {
    const taskId = task.id;
    if (
      !workspaceId ||
      !projectId ||
      !window.confirm(`Delete ${task.code}: ${task.title}?`)
    )
      return;
    setPending(true);
    try {
      await kanbanApi.deleteTask(workspaceId, projectId, taskId);

      // A board request started before the DELETE can contain the deleted task.
      // Invalidate it before committing the server-confirmed local change.
      boardRequestVersion.current += 1;
      setLoading(false);
      setBoard((currentBoard) => {
        if (!currentBoard) return currentBoard;
        const nextBoard = {
          ...currentBoard,
          columns: currentBoard.columns.map((column) => ({
            ...column,
            tasks: column.tasks.filter((item) => item.id !== taskId),
          })),
        };
        return nextBoard;
      });
      onDataChanged?.();
      onNotify("Task deleted successfully.");
    } catch (caught: unknown) {
      onNotify(
        caught instanceof ApiError ? caught.message : "Unable to delete task.",
      );
    } finally {
      setPending(false);
    }
  }

  function openColumn(column?: KanbanColumn) {
    setEditingColumn(column ?? null);
    setColumnForm(
      column
        ? {
            title: column.title,
            color: column.color,
            category: column.category,
          }
        : { title: "", color: "gray", category: "TODO" },
    );
    setColumnModalOpen(true);
  }

  async function submitColumn(event: React.FormEvent) {
    event.preventDefault();
    if (!workspaceId || !projectId || !columnForm.title.trim()) return;
    setPending(true);
    try {
      if (editingColumn) {
        await kanbanApi.updateColumn(workspaceId, projectId, editingColumn.id, {
          ...columnForm,
          title: columnForm.title.trim(),
        });
        onNotify("Status updated successfully.");
      } else {
        await kanbanApi.createColumn(workspaceId, projectId, {
          ...columnForm,
          title: columnForm.title.trim(),
        });
        onNotify("Status created successfully.");
      }
      setColumnModalOpen(false);
      await load();
      onDataChanged?.();
    } catch (caught: unknown) {
      onNotify(
        caught instanceof ApiError ? caught.message : "Unable to save status.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteColumn(column: KanbanColumn) {
    if (!workspaceId || !projectId || !board || board.columns.length <= 1)
      return;
    const target = board.columns.find((item) => item.id !== column.id);
    if (
      !target ||
      !window.confirm(
        `Delete status “${column.title}”? Its tasks will move to “${target.title}”.`,
      )
    )
      return;
    setPending(true);
    try {
      await kanbanApi.deleteColumn(
        workspaceId,
        projectId,
        column.id,
        column.tasks.length ? target.id : undefined,
      );
      await load();
      onDataChanged?.();
      onNotify("Status deleted successfully.");
    } catch (caught: unknown) {
      onNotify(
        caught instanceof ApiError
          ? caught.message
          : "Unable to delete status.",
      );
    } finally {
      setPending(false);
    }
  }

  async function dropTask(columnId: string) {
    if (!workspaceId || !projectId || !draggedTaskId) return;
    const task = tasks.find((item) => item.id === draggedTaskId);
    setDropTarget(null);
    setDraggedTaskId(null);
    if (!task || task.columnId === columnId) return;
    try {
      await kanbanApi.moveTask(workspaceId, projectId, task.id, { columnId });
      await load();
      onDataChanged?.();
      onNotify("Task moved successfully.");
    } catch (caught: unknown) {
      onNotify(
        caught instanceof ApiError ? caught.message : "Unable to move task.",
      );
    }
  }

  if (!projectId)
    return (
      <main id="main" className={styles.workspaceState}>
        <h2>Select a project</h2>
        <p>Choose or create a project to open its Kanban board.</p>
      </main>
    );
  if (loading && !board)
    return (
      <main id="main" className={styles.workspaceState}>
        <div className={styles.workspaceSpinner} />
        <h2>Loading Kanban board</h2>
      </main>
    );
  if (error)
    return (
      <main id="main" className={styles.workspaceState}>
        <Icon name="alert" size={28} />
        <h2>Board unavailable</h2>
        <p>{error}</p>
        <button onClick={() => void load()}>Try again</button>
      </main>
    );
  if (!board) return null;

  return (
    <main id="main" className={`${styles.main} ${styles.kanbanMain}`}>
      <div className={styles.kanbanHero}>
        <div>
          <h1>Kanban Board</h1>
          <p>Manage database-backed tasks across {workspaceName}</p>
        </div>
        <button
          className={styles.reportButton}
          onClick={() => openTask()}
          disabled={pending}
        >
          <Icon name="plus" size={19} />
          Add Task
        </button>
      </div>
      <section className={styles.kanbanToolbar} aria-label="Kanban filters">
        <label className={styles.kanbanSearch}>
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks by title, code, or assignee..."
          />
        </label>
        <label className={styles.kanbanSelectWrap}>
          <span>Priority Filter</span>
          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value as TaskPriority | "all")
            }
          >
            <option value="all">All Priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {label(priority)}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section
        className={styles.kanbanBoard}
        style={{
          gridTemplateColumns: `repeat(${board.columns.length}, minmax(245px, 1fr)) minmax(180px, 220px)`,
        }}
      >
        {board.columns.map((column) => {
          const columnTasks = filteredTasks.filter(
            (task) => task.columnId === column.id,
          );
          return (
            <article
              key={column.id}
              className={`${styles.kanbanColumn} ${dropTarget === column.id ? styles.kanbanColumnActive : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => setDropTarget(column.id)}
              onDrop={() => void dropTask(column.id)}
            >
              <div className={styles.kanbanColumnHeader}>
                <div>
                  <i
                    className={`${styles.kanbanDot} ${styles[colorClasses[column.color] ?? "kanbanGray"]}`}
                  />
                  <h2>{column.title}</h2>
                  <span>{column.tasks.length}</span>
                </div>
                <div className={styles.kanbanColumnActions}>
                  <button
                    onClick={() => openTask(column.id)}
                    aria-label={`Add task to ${column.title}`}
                  >
                    <Icon name="plus" size={15} />
                  </button>
                  <button
                    onClick={() => openColumn(column)}
                    aria-label={`Edit ${column.title}`}
                  >
                    •••
                  </button>
                </div>
              </div>
              <div className={styles.kanbanCards}>
                {columnTasks.map((task) => (
                  <article
                    key={task.id}
                    draggable
                    className={`${styles.kanbanCard} ${draggedTaskId === task.id ? styles.kanbanCardDragging : ""}`}
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDropTarget(null);
                    }}
                  >
                    <div className={styles.kanbanCardTop}>
                      <span className={styles.kanbanCode}>{task.code}</span>
                      <div className={styles.kanbanCardTopRight}>
                        <span
                          className={`${styles.kanbanPriority} ${styles[`kanbanPriority${label(task.priority).replaceAll(" ", "")}`]}`}
                        >
                          {label(task.priority)}
                        </span>
                        <button
                          className={styles.kanbanTaskMenuButton}
                          onClick={() => openTask(undefined, task)}
                          aria-label={`Edit ${task.code}`}
                        >
                          •••
                        </button>
                      </div>
                    </div>
                    <h3>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                    <div className={styles.kanbanMeta}>
                      <span className={styles.kanbanAvatar}>
                        {task.assignee?.name.charAt(0).toUpperCase() ?? "?"}
                      </span>
                      <b>{task.assignee?.name ?? "Unassigned"}</b>
                      {task.storyPoints !== null && (
                        <small>{task.storyPoints} SP</small>
                      )}
                    </div>
                    {task.dueDate && (
                      <time className={styles.kanbanDue}>
                        Due{" "}
                        {new Date(
                          `${task.dueDate}T00:00:00`,
                        ).toLocaleDateString()}
                      </time>
                    )}
                    <button
                      type="button"
                      className={styles.kanbanDeleteInline}
                      onClick={() => void deleteTask(task)}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            </article>
          );
        })}
        <button
          className={styles.kanbanAddStatusButton}
          onClick={() => openColumn()}
        >
          <Icon name="plus" size={17} />
          Add status
        </button>
      </section>

      {taskModalOpen && (
        <div
          className={styles.kanbanModalBackdrop}
          onMouseDown={() => !pending && setTaskModalOpen(false)}
        >
          <section
            className={styles.kanbanModal}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.kanbanModalHeader}>
              <div>
                <h2>{editingTask ? "Edit Task" : "Add Task"}</h2>
                <p>Task details are shared with the workspace dashboard.</p>
              </div>
              <button onClick={() => setTaskModalOpen(false)}>
                <Icon name="plus" size={18} />
              </button>
            </div>
            <form className={styles.kanbanForm} onSubmit={submitTask}>
              <label>
                <span>Title</span>
                <input
                  required
                  maxLength={160}
                  value={taskForm.title}
                  onChange={(event) =>
                    changeTaskForm("title", event.target.value)
                  }
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(event) =>
                    changeTaskForm("description", event.target.value)
                  }
                />
              </label>
              <div className={styles.kanbanFormGrid}>
                <label>
                  <span>Priority</span>
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      changeTaskForm(
                        "priority",
                        event.target.value as TaskPriority,
                      )
                    }
                  >
                    {priorities.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Assignee</span>
                  <select
                    value={taskForm.assigneeId}
                    onChange={(event) =>
                      changeTaskForm("assigneeId", event.target.value)
                    }
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Due Date</span>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) =>
                      changeTaskForm("dueDate", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Story Points</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taskForm.storyPoints}
                    onChange={(event) =>
                      changeTaskForm("storyPoints", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={taskForm.columnId}
                    onChange={(event) =>
                      changeTaskForm("columnId", event.target.value)
                    }
                  >
                    {board.columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Sprint</span>
                  <select
                    value={taskForm.sprintId}
                    onChange={(event) =>
                      changeTaskForm("sprintId", event.target.value)
                    }
                  >
                    <option value="">No sprint</option>
                    {sprints.map((sprint) => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.kanbanModalActions}>
                <button type="button" onClick={() => setTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={pending}>
                  {pending ? "Saving..." : "Save Task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {columnModalOpen && (
        <div
          className={styles.kanbanModalBackdrop}
          onMouseDown={() => !pending && setColumnModalOpen(false)}
        >
          <section
            className={styles.kanbanStatusModal}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.kanbanModalHeader}>
              <div>
                <h2>{editingColumn ? "Edit Status" : "Add Status"}</h2>
                <p>Category controls how Dashboard metrics classify tasks.</p>
              </div>
              <button onClick={() => setColumnModalOpen(false)}>
                <Icon name="plus" size={18} />
              </button>
            </div>
            <form className={styles.kanbanForm} onSubmit={submitColumn}>
              <label>
                <span>Status name</span>
                <input
                  required
                  value={columnForm.title}
                  onChange={(event) =>
                    setColumnForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Dashboard category</span>
                <select
                  value={columnForm.category}
                  onChange={(event) =>
                    setColumnForm((current) => ({
                      ...current,
                      category: event.target.value as ColumnCategory,
                    }))
                  }
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {label(item)}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className={styles.kanbanColorPicker}>
                <legend>Status color</legend>
                <div>
                  {colors.map((color) => (
                    <label key={color}>
                      <input
                        type="radio"
                        checked={columnForm.color === color}
                        onChange={() =>
                          setColumnForm((current) => ({ ...current, color }))
                        }
                      />
                      <span
                        className={`${styles.kanbanColorDot} ${styles[colorClasses[color] ?? "kanbanGray"]}`}
                      />
                      <b>{label(color)}</b>
                    </label>
                  ))}
                </div>
              </fieldset>
              {editingColumn && (
                <button
                  type="button"
                  className={styles.kanbanDangerButton}
                  disabled={board.columns.length <= 1 || pending}
                  onClick={() => {
                    setColumnModalOpen(false);
                    void deleteColumn(editingColumn);
                  }}
                >
                  Delete status
                </button>
              )}
              <div className={styles.kanbanModalActions}>
                <button type="button" onClick={() => setColumnModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={pending}>
                  {pending ? "Saving..." : "Save status"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function taskFormFor(task: KanbanTask, columnId = task.columnId): TaskForm {
  return {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    assigneeId: task.assigneeId ?? "",
    dueDate: task.dueDate ?? "",
    storyPoints: task.storyPoints?.toString() ?? "",
    sprintId: task.sprintId ?? "",
    columnId,
  };
}
