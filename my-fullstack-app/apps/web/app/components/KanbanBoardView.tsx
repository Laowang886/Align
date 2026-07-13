"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../page.module.css";
import Icon from "./Icon";

type KanbanColumnId = "backlog" | "ready" | "in-progress" | "in-review" | "done";
type KanbanStatusId = KanbanColumnId | `custom-${number}`;
type KanbanPriority = "urgent" | "high" | "medium" | "low";
type KanbanAssignee = "Renbo" | "Alice" | "Bob" | "Unassigned";
type TaskModalMode = "create" | "edit";
type StatusModalMode = "create" | "edit";
type KanbanColumnColor = "gray" | "blue" | "amber" | "purple" | "green" | "red";

type KanbanColumn = {
  id: KanbanStatusId;
  label: string;
  color: KanbanColumnColor;
};

type KanbanTask = {
  id: string;
  code: string;
  title: string;
  description: string;
  priority: KanbanPriority;
  assignee: KanbanAssignee;
  dueDate: string | null;
  status: KanbanStatusId;
};

type KanbanTaskForm = {
  title: string;
  description: string;
  priority: KanbanPriority;
  assignee: KanbanAssignee;
  dueDate: string;
  status: KanbanStatusId;
};

type StatusForm = {
  name: string;
  color: KanbanColumnColor;
};

type KanbanBoardViewProps = {
  onNotify: (message: string) => void;
  workspaceName?: string;
};

const INITIAL_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "backlog", label: "Backlog", color: "gray" },
  { id: "ready", label: "Ready", color: "blue" },
  { id: "in-progress", label: "In progress", color: "amber" },
  { id: "in-review", label: "In review", color: "purple" },
  { id: "done", label: "Done", color: "green" },
];

const DEFAULT_STATUS: KanbanStatusId = "ready";
const priorities: KanbanPriority[] = ["urgent", "high", "medium", "low"];
const assignees: KanbanAssignee[] = ["Renbo", "Alice", "Bob", "Unassigned"];
const statusColorOptions: { value: KanbanColumnColor; label: string }[] = [
  { value: "gray", label: "Gray" },
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
  { value: "purple", label: "Purple" },
  { value: "green", label: "Green" },
  { value: "red", label: "Red" },
];
const statusColorClass: Record<KanbanColumnColor, string> = {
  gray: "kanbanGray",
  blue: "kanbanBlue",
  amber: "kanbanAmber",
  purple: "kanbanPurple",
  green: "kanbanGreen",
  red: "kanbanRed",
};

const initialTasks: KanbanTask[] = [
  {
    id: "task-fw-112",
    code: "FW-112",
    title: "Prepare stakeholder release notes",
    description: "",
    priority: "medium",
    assignee: "Unassigned",
    dueDate: "Jul 18, 2026",
    status: "backlog",
  },
  {
    id: "task-fw-109",
    code: "FW-109",
    title: "Review sprint analytics metrics",
    description: "",
    priority: "high",
    assignee: "Alice",
    dueDate: "Jul 15, 2026",
    status: "ready",
  },
  {
    id: "task-fw-105",
    code: "FW-105",
    title: "Finish dashboard data integration",
    description: "",
    priority: "urgent",
    assignee: "Renbo",
    dueDate: "Jul 12, 2026",
    status: "in-progress",
  },
  {
    id: "task-fw-103",
    code: "FW-103",
    title: "Kanban drag and drop interaction",
    description: "",
    priority: "high",
    assignee: "Bob",
    dueDate: null,
    status: "in-review",
  },
  {
    id: "task-fw-101",
    code: "FW-101",
    title: "Define reusable task status pipeline",
    description: "",
    priority: "medium",
    assignee: "Alice",
    dueDate: null,
    status: "done",
  },
  {
    id: "task-fw-102",
    code: "FW-102",
    title: "Implement workspace dashboard analytics",
    description: "",
    priority: "high",
    assignee: "Renbo",
    dueDate: null,
    status: "done",
  },
];

const emptyForm: KanbanTaskForm = {
  title: "",
  description: "",
  priority: "medium",
  assignee: "Unassigned",
  dueDate: "",
  status: DEFAULT_STATUS,
};

const emptyStatusForm: StatusForm = {
  name: "",
  color: "gray",
};

function toTitleCase(value: KanbanPriority) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatInputDate(value: string) {
  if (!value) return null;

  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toInputDate(value: string | null) {
  if (!value) return "";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAvatarLabel(assignee: KanbanAssignee) {
  if (assignee === "Unassigned") return "?";

  return assignee.charAt(0);
}

function getNextTaskCode(tasks: KanbanTask[]) {
  const highest = tasks.reduce((max, task) => {
    const match = /^FW-(\d+)$/.exec(task.code);

    if (!match) return max;

    return Math.max(max, Number(match[1]));
  }, 0);

  return `FW-${highest + 1}`;
}

function getTaskForm(task: KanbanTask): KanbanTaskForm {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    assignee: task.assignee,
    dueDate: toInputDate(task.dueDate),
    status: task.status,
  };
}

function getNextCustomColumnId(columns: KanbanColumn[]): KanbanStatusId {
  const highestCustomId = columns.reduce((highest, column) => {
    const match = /^custom-(\d+)$/.exec(column.id);

    if (!match) return highest;

    return Math.max(highest, Number(match[1]));
  }, 0);

  return `custom-${highestCustomId + 1}`;
}

function isDuplicateStatusName(columns: KanbanColumn[], name: string, currentStatusId: KanbanStatusId | null) {
  const normalizedName = name.trim().toLowerCase();

  return columns.some((column) => column.id !== currentStatusId && column.label.trim().toLowerCase() === normalizedName);
}

export default function KanbanBoardView({ onNotify, workspaceName = "this workspace" }: KanbanBoardViewProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(INITIAL_KANBAN_COLUMNS);
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<KanbanPriority | "all">("all");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanStatusId | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TaskModalMode>("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<KanbanStatusId | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalMode, setStatusModalMode] = useState<StatusModalMode>("create");
  const [editingStatusId, setEditingStatusId] = useState<KanbanStatusId | null>(null);
  const [statusForm, setStatusForm] = useState<StatusForm>(emptyStatusForm);
  const [statusNameError, setStatusNameError] = useState("");
  const [deleteStatusId, setDeleteStatusId] = useState<KanbanStatusId | null>(null);
  const [deleteMoveTarget, setDeleteMoveTarget] = useState<KanbanStatusId | "">("");
  const [form, setForm] = useState<KanbanTaskForm>(emptyForm);
  const [titleError, setTitleError] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const statusNameInputRef = useRef<HTMLInputElement>(null);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch = query.length === 0
        || task.title.toLowerCase().includes(query)
        || task.code.toLowerCase().includes(query)
        || task.assignee.toLowerCase().includes(query);
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [priorityFilter, search, tasks]);

  const taskToDelete = useMemo(
    () => tasks.find((task) => task.id === deleteTaskId) ?? null,
    [deleteTaskId, tasks],
  );
  const statusToDelete = useMemo(
    () => columns.find((column) => column.id === deleteStatusId) ?? null,
    [columns, deleteStatusId],
  );
  const deleteStatusTaskCount = useMemo(
    () => (deleteStatusId === null ? 0 : tasks.filter((task) => task.status === deleteStatusId).length),
    [deleteStatusId, tasks],
  );
  const availableMoveTargets = useMemo(
    () => columns.filter((column) => column.id !== deleteStatusId),
    [columns, deleteStatusId],
  );

  useEffect(() => {
    if (!modalOpen) return;

    titleInputRef.current?.focus();
  }, [modalOpen]);

  useEffect(() => {
    if (!statusModalOpen) return;

    statusNameInputRef.current?.focus();
  }, [statusModalOpen]);

  useEffect(() => {
    if (
      !modalOpen
      && !statusModalOpen
      && openMenuTaskId === null
      && openStatusMenuId === null
      && deleteTaskId === null
      && deleteStatusId === null
    ) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (deleteStatusId !== null) closeDeleteStatusDialog();
      else if (deleteTaskId !== null) closeDeleteDialog();
      else if (statusModalOpen) closeStatusModal();
      else if (modalOpen) closeModal();
      else if (openStatusMenuId !== null) setOpenStatusMenuId(null);
      else setOpenMenuTaskId(null);
    }

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [deleteStatusId, deleteTaskId, modalOpen, openMenuTaskId, openStatusMenuId, statusModalOpen]);

  function openCreateModal(status: KanbanStatusId = DEFAULT_STATUS) {
    setForm({ ...emptyForm, status });
    setModalMode("create");
    setEditingTaskId(null);
    setOpenMenuTaskId(null);
    setTitleError("");
    setModalOpen(true);
  }

  function openEditModal(task: KanbanTask) {
    setForm(getTaskForm(task));
    setModalMode("edit");
    setEditingTaskId(task.id);
    setOpenMenuTaskId(null);
    setTitleError("");
    setModalOpen(true);
  }

  function openCreateStatusModal() {
    setStatusForm(emptyStatusForm);
    setStatusModalMode("create");
    setEditingStatusId(null);
    setStatusNameError("");
    setOpenStatusMenuId(null);
    setStatusModalOpen(true);
  }

  function openEditStatusModal(column: KanbanColumn) {
    setStatusForm({ name: column.label, color: column.color });
    setStatusModalMode("edit");
    setEditingStatusId(column.id);
    setStatusNameError("");
    setOpenStatusMenuId(null);
    setStatusModalOpen(true);
  }

  function closeStatusModal() {
    setStatusModalOpen(false);
    setStatusModalMode("create");
    setEditingStatusId(null);
    setStatusForm(emptyStatusForm);
    setStatusNameError("");
  }

  function updateStatusForm<Value extends keyof StatusForm>(field: Value, value: StatusForm[Value]) {
    setStatusForm((current) => ({ ...current, [field]: value }));

    if (field === "name") setStatusNameError("");
  }

  function submitStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = statusForm.name.trim();

    if (!name) {
      setStatusNameError("Status name is required.");
      statusNameInputRef.current?.focus();
      return;
    }

    if (isDuplicateStatusName(columns, name, editingStatusId)) {
      setStatusNameError("A status with this name already exists.");
      statusNameInputRef.current?.focus();
      return;
    }

    if (statusModalMode === "edit" && editingStatusId !== null) {
      setColumns((current) => current.map((column) => (
        column.id === editingStatusId
          ? { ...column, label: name, color: statusForm.color }
          : column
      )));
      closeStatusModal();
      onNotify("Status updated successfully.");
      return;
    }

    const nextColumn: KanbanColumn = {
      id: getNextCustomColumnId(columns),
      label: name,
      color: statusForm.color,
    };

    setColumns((current) => [...current, nextColumn]);
    closeStatusModal();
    onNotify("Status created successfully.");
  }

  function closeModal() {
    setModalOpen(false);
    setModalMode("create");
    setEditingTaskId(null);
    setForm(emptyForm);
    setTitleError("");
  }

  function updateForm<Value extends keyof KanbanTaskForm>(field: Value, value: KanbanTaskForm[Value]) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === "title") setTitleError("");
  }

  function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();

    if (!title) {
      setTitleError("Title is required.");
      titleInputRef.current?.focus();
      return;
    }

    if (modalMode === "edit" && editingTaskId !== null) {
      setTasks((current) => current.map((task) => (
        task.id === editingTaskId
          ? {
            ...task,
            title,
            description: form.description.trim(),
            priority: form.priority,
            assignee: form.assignee,
            dueDate: formatInputDate(form.dueDate),
            status: form.status,
          }
          : task
      )));
      closeModal();
      onNotify("Task updated successfully.");
      return;
    }

    const code = getNextTaskCode(tasks);
    const nextTask: KanbanTask = {
      id: `task-${code.toLowerCase()}`,
      code,
      title,
      description: form.description.trim(),
      priority: form.priority,
      assignee: form.assignee,
      dueDate: formatInputDate(form.dueDate),
      status: form.status,
    };

    setTasks((current) => [...current, nextTask]);
    closeModal();
    onNotify("Task created successfully.");
  }

  function toggleTaskMenu(taskId: string) {
    setOpenMenuTaskId((current) => (current === taskId ? null : taskId));
    setOpenStatusMenuId(null);
  }

  function toggleStatusMenu(statusId: KanbanStatusId) {
    setOpenStatusMenuId((current) => (current === statusId ? null : statusId));
    setOpenMenuTaskId(null);
  }

  function openDeleteDialog(taskId: string) {
    setDeleteTaskId(taskId);
    setOpenMenuTaskId(null);
  }

  function closeDeleteDialog() {
    setDeleteTaskId(null);
  }

  function confirmDeleteTask() {
    if (deleteTaskId === null) return;

    setTasks((current) => current.filter((task) => task.id !== deleteTaskId));
    closeDeleteDialog();
    onNotify("Task deleted successfully.");
  }

  function openDeleteStatusDialog(statusId: KanbanStatusId) {
    if (columns.length <= 1) return;

    const firstMoveTarget = columns.find((column) => column.id !== statusId)?.id ?? "";

    setDeleteStatusId(statusId);
    setDeleteMoveTarget(firstMoveTarget);
    setOpenStatusMenuId(null);
  }

  function closeDeleteStatusDialog() {
    setDeleteStatusId(null);
    setDeleteMoveTarget("");
  }

  function confirmDeleteStatus() {
    if (deleteStatusId === null || columns.length <= 1) return;
    if (deleteStatusTaskCount > 0 && deleteMoveTarget === "") return;

    const nextDefaultStatus = deleteMoveTarget || availableMoveTargets[0]?.id || DEFAULT_STATUS;

    setTasks((current) => current.map((task) => (
      task.status === deleteStatusId ? { ...task, status: nextDefaultStatus } : task
    )));
    setColumns((current) => current.filter((column) => column.id !== deleteStatusId));
    setForm((current) => (
      current.status === deleteStatusId ? { ...current, status: nextDefaultStatus } : current
    ));
    closeDeleteStatusDialog();
    onNotify("Status deleted successfully.");
  }

  function handleDragStart(event: React.DragEvent<HTMLElement>, taskId: string) {
    setDraggedTaskId(taskId);
    setOpenMenuTaskId(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDragEnter(event: React.DragEvent<HTMLElement>, columnId: KanbanStatusId) {
    event.preventDefault();
    setDropTarget(columnId);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>, columnId: KanbanStatusId) {
    event.preventDefault();

    const taskId = draggedTaskId ?? event.dataTransfer.getData("text/plain");

    if (!taskId) return;

    setTasks((current) => current.map((task) => (
      task.id === taskId ? { ...task, status: columnId } : task
    )));
    setDraggedTaskId(null);
    setDropTarget(null);
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDropTarget(null);
  }

  const modalTitle = modalMode === "create" ? "Add Task" : "Edit Task";
  const modalDescription = modalMode === "create"
    ? "Create a task for the board."
    : "Update this task.";
  const submitLabel = modalMode === "create" ? "Create Task" : "Save Changes";
  const statusModalTitle = statusModalMode === "create" ? "Add Status" : "Edit Status";
  const statusSubmitLabel = statusModalMode === "create" ? "Create status" : "Save status";

  return <main id="main" className={styles.main}>
    <div className={styles.kanbanHero}>
      <div>
        <h1>Kanban Board</h1>
        <p>Manage tasks across the {workspaceName} board</p>
      </div>
      <button className={styles.reportButton} onClick={() => openCreateModal()} type="button">
        <Icon name="plus" size={19} />Add Task
      </button>
    </div>

    <section className={styles.kanbanToolbar} aria-label="Kanban filters">
      <label className={styles.kanbanSearch}>
        <span>Search</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks by title, code, or assignee..."
          type="search"
        />
      </label>
      <label className={styles.kanbanSelectWrap}>
        <span>Priority Filter</span>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as KanbanPriority | "all")}
        >
          <option value="all">All Priorities</option>
          {priorities.map((priority) => <option key={priority} value={priority}>{toTitleCase(priority)}</option>)}
        </select>
      </label>
    </section>

    <section
      className={styles.kanbanBoard}
      aria-label="Kanban board"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(245px, 1fr)) minmax(180px, 220px)` }}
    >
      {columns.map((column) => {
        const columnTasks = filteredTasks.filter((task) => task.status === column.id);
        const totalColumnTasks = tasks.filter((task) => task.status === column.id).length;
        const isDropTarget = dropTarget === column.id && draggedTaskId !== null;

        return <article
          className={`${styles.kanbanColumn} ${isDropTarget ? styles.kanbanColumnActive : ""}`}
          key={column.id}
          onDragOver={handleDragOver}
          onDragEnter={(event) => handleDragEnter(event, column.id)}
          onDrop={(event) => handleDrop(event, column.id)}
        >
          <div className={styles.kanbanColumnHeader}>
            <div>
              <i className={`${styles.kanbanDot} ${styles[statusColorClass[column.color]]}`} />
              <h2>{column.label}</h2>
              <span>{totalColumnTasks}</span>
            </div>
            <div className={styles.kanbanColumnActions}>
              <button type="button" onClick={() => openCreateModal(column.id)} aria-label={`Add task to ${column.label}`}>
                <Icon name="plus" size={15} />
              </button>
              <div className={styles.kanbanStatusMenuWrap}>
                <button
                  className={styles.kanbanStatusMenuButton}
                  type="button"
                  aria-label={`Open settings for ${column.label}`}
                  aria-expanded={openStatusMenuId === column.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleStatusMenu(column.id);
                  }}
                >
                  <span aria-hidden="true">...</span>
                </button>
                {openStatusMenuId === column.id && <>
                  <button className={styles.kanbanMenuOverlay} type="button" aria-label="Close status actions" onClick={() => setOpenStatusMenuId(null)} />
                  <div className={styles.kanbanStatusMenu} role="menu">
                    <button type="button" role="menuitem" onClick={() => openEditStatusModal(column)}>Edit status</button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={columns.length <= 1}
                      title={columns.length <= 1 ? "At least one status is required." : undefined}
                      onClick={() => openDeleteStatusDialog(column.id)}
                    >
                      Delete status
                    </button>
                    {columns.length <= 1 && <p>At least one status is required.</p>}
                  </div>
                </>}
              </div>
            </div>
          </div>
          <div className={styles.kanbanCards}>
            {columnTasks.map((task) => <article
              className={`${styles.kanbanCard} ${draggedTaskId === task.id ? styles.kanbanCardDragging : ""}`}
              draggable
              key={task.id}
              onDragStart={(event) => handleDragStart(event, task.id)}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.kanbanCardTop}>
                <span className={styles.kanbanCode}>{task.code}</span>
                <div className={styles.kanbanCardTopRight}>
                  <span className={`${styles.kanbanPriority} ${styles[`kanbanPriority${toTitleCase(task.priority)}`]}`}>
                    {toTitleCase(task.priority)}
                  </span>
                  <div className={styles.kanbanTaskMenuWrap}>
                    <button
                      className={styles.kanbanTaskMenuButton}
                      type="button"
                      aria-label={`Open actions for ${task.code}`}
                      aria-expanded={openMenuTaskId === task.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleTaskMenu(task.id);
                      }}
                    >
                      <span aria-hidden="true">...</span>
                    </button>
                    {openMenuTaskId === task.id && <>
                      <button className={styles.kanbanMenuOverlay} type="button" aria-label="Close task actions" onClick={() => setOpenMenuTaskId(null)} />
                      <div className={styles.kanbanTaskMenu} role="menu">
                        <button type="button" role="menuitem" onClick={() => openEditModal(task)}>Edit task</button>
                        <button type="button" role="menuitem" onClick={() => openDeleteDialog(task.id)}>Delete task</button>
                      </div>
                    </>}
                  </div>
                </div>
              </div>
              <h3>{task.title}</h3>
              {task.description && <p>{task.description}</p>}
              <div className={styles.kanbanMeta}>
                <span className={styles.kanbanAvatar}>{getAvatarLabel(task.assignee)}</span>
                <b>{task.assignee}</b>
              </div>
              {task.dueDate && <time className={styles.kanbanDue}>Due {task.dueDate}</time>}
            </article>)}
          </div>
        </article>;
      })}
      <button className={styles.kanbanAddStatusButton} type="button" onClick={openCreateStatusModal}>
        <Icon name="plus" size={17} />Add status
      </button>
    </section>

    {modalOpen && <div className={styles.kanbanModalBackdrop} onMouseDown={closeModal}>
      <section className={styles.kanbanModal} role="dialog" aria-modal="true" aria-labelledby="kanban-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.kanbanModalHeader}>
          <div>
            <h2 id="kanban-modal-title">{modalTitle}</h2>
            <p>{modalDescription}</p>
          </div>
          <button type="button" onClick={closeModal} aria-label="Close modal"><Icon name="plus" size={18} /></button>
        </div>
        <form className={styles.kanbanForm} onSubmit={submitTask}>
          <label>
            <span>Title</span>
            <input
              ref={titleInputRef}
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              aria-invalid={titleError ? "true" : "false"}
            />
            {titleError && <small>{titleError}</small>}
          </label>
          <label>
            <span>Description</span>
            <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} rows={3} />
          </label>
          <div className={styles.kanbanFormGrid}>
            <label>
              <span>Priority</span>
              <select value={form.priority} onChange={(event) => updateForm("priority", event.target.value as KanbanPriority)}>
                {priorities.map((priority) => <option key={priority} value={priority}>{toTitleCase(priority)}</option>)}
              </select>
            </label>
            <label>
              <span>Assignee</span>
              <select value={form.assignee} onChange={(event) => updateForm("assignee", event.target.value as KanbanAssignee)}>
                {assignees.map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}
              </select>
            </label>
            <label>
              <span>Due Date</span>
              <input type="date" value={form.dueDate} onChange={(event) => updateForm("dueDate", event.target.value)} />
            </label>
            <label>
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateForm("status", event.target.value as KanbanStatusId)}>
                {columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.kanbanModalActions}>
            <button type="button" onClick={closeModal}>Cancel</button>
            <button type="submit">{submitLabel}</button>
          </div>
        </form>
      </section>
    </div>}

    {statusModalOpen && <div className={styles.kanbanModalBackdrop} onMouseDown={closeStatusModal}>
      <section className={styles.kanbanStatusModal} role="dialog" aria-modal="true" aria-labelledby="kanban-status-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.kanbanModalHeader}>
          <div>
            <h2 id="kanban-status-modal-title">{statusModalTitle}</h2>
            <p>{statusModalMode === "create" ? "Create a board status." : "Update this status."}</p>
          </div>
          <button type="button" onClick={closeStatusModal} aria-label="Close status modal"><Icon name="plus" size={18} /></button>
        </div>
        <form className={styles.kanbanForm} onSubmit={submitStatus}>
          <label>
            <span>Status name</span>
            <input
              ref={statusNameInputRef}
              value={statusForm.name}
              onChange={(event) => updateStatusForm("name", event.target.value)}
              aria-invalid={statusNameError ? "true" : "false"}
            />
            {statusNameError && <small>{statusNameError}</small>}
          </label>
          <fieldset className={styles.kanbanColorPicker}>
            <legend>Status color</legend>
            <div>
              {statusColorOptions.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="status-color"
                    value={option.value}
                    checked={statusForm.color === option.value}
                    onChange={() => updateStatusForm("color", option.value)}
                  />
                  <span className={`${styles.kanbanColorDot} ${styles[statusColorClass[option.value]]}`} />
                  <b>{option.label}</b>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.kanbanModalActions}>
            <button type="button" onClick={closeStatusModal}>Cancel</button>
            <button type="submit">{statusSubmitLabel}</button>
          </div>
        </form>
      </section>
    </div>}

    {statusToDelete && <div className={styles.kanbanModalBackdrop} onMouseDown={closeDeleteStatusDialog}>
      <section className={styles.kanbanConfirmDialog} role="dialog" aria-modal="true" aria-labelledby="kanban-delete-status-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.kanbanModalHeader}>
          <div>
            <h2 id="kanban-delete-status-title">Delete status?</h2>
            <p>{statusToDelete.label}</p>
          </div>
        </div>
        <div className={styles.kanbanStatusDeleteBody}>
          <p>Current tasks: <strong>{deleteStatusTaskCount}</strong></p>
          {deleteStatusTaskCount > 0 && <label>
            <span>Move tasks to:</span>
            <select value={deleteMoveTarget} onChange={(event) => setDeleteMoveTarget(event.target.value as KanbanStatusId)}>
              {availableMoveTargets.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
            </select>
          </label>}
          {columns.length <= 1 && <small>At least one status is required.</small>}
        </div>
        <div className={styles.kanbanModalActions}>
          <button type="button" onClick={closeDeleteStatusDialog}>Cancel</button>
          <button
            className={styles.kanbanDangerButton}
            type="button"
            disabled={columns.length <= 1 || (deleteStatusTaskCount > 0 && deleteMoveTarget === "")}
            onClick={confirmDeleteStatus}
          >
            Delete status
          </button>
        </div>
      </section>
    </div>}

    {taskToDelete && <div className={styles.kanbanModalBackdrop} onMouseDown={closeDeleteDialog}>
      <section className={styles.kanbanConfirmDialog} role="dialog" aria-modal="true" aria-labelledby="kanban-delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.kanbanModalHeader}>
          <div>
            <h2 id="kanban-delete-title">Delete task?</h2>
            <p>{taskToDelete.code}: {taskToDelete.title}</p>
          </div>
        </div>
        <div className={styles.kanbanModalActions}>
          <button type="button" onClick={closeDeleteDialog}>Cancel</button>
          <button className={styles.kanbanDangerButton} type="button" onClick={confirmDeleteTask}>Delete</button>
        </div>
      </section>
    </div>}
  </main>;
}
